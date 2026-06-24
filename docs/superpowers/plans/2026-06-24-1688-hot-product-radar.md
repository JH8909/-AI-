# 1688 Hot Product Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent 1688 monitoring loop that expands 10 seed keywords, collects up to 50 public offers per keyword every six hours, computes a deterministic daily Top 20, and displays and pushes the result without bypassing platform controls.

**Architecture:** n8n creates scheduled jobs and notification runs, Supabase stores the queue and all durable state, and one Python Playwright worker atomically claims and completes crawl jobs. Next.js exposes the operator APIs and hot-radar UI; deterministic TypeScript scoring owns all numeric scores while DeepSeek only expands keywords and explains completed scores.

**Tech Stack:** Next.js 14 App Router, TypeScript/JavaScript, Node test runner, Supabase/PostgreSQL, Python 3.11+, Playwright, `httpx`, n8n, DeepSeek OpenAI-compatible API.

---

## Scope Guardrails

- Preserve the current directory and service boundaries.
- Preserve the user's existing uncommitted UTF-8 scraper subprocess changes in:
  - `apps/admin-panel/src/app/api/products/import-link/route.ts`
  - `apps/admin-panel/src/lib/import-link-utils.js`
  - `apps/admin-panel/src/lib/import-link-utils.test.js`
- Do not use `git add -A`; stage only files named by each task.
- Do not add Redis, Celery, a proxy pool, automatic publishing, purchasing, CAPTCHA handling, or login automation.
- Treat the first public-page block or CAPTCHA response as a structured task failure.
- Run base Supabase schema initialization before the radar migration. Service-role REST credentials cannot create tables.

## File Map

### Database

- Create `packages/supabase-schema/migrations/20260624_hot_product_radar.sql`: additive radar tables, product candidate state, constraints, indexes, RLS, and atomic job claim RPC.
- Modify `packages/supabase-schema/README.md`: application order and radar relationships.

### Next.js domain and APIs

- Create `apps/admin-panel/src/lib/hot-radar-utils.js`: keyword normalization, confidence calculation, deterministic scoring, and notification payload builders.
- Create `apps/admin-panel/src/lib/hot-radar-utils.test.js`: pure unit tests.
- Create `apps/admin-panel/src/app/api/hot-radar/keywords/route.ts`: keyword list and replacement.
- Create `apps/admin-panel/src/app/api/hot-radar/expand/route.ts`: bounded DeepSeek expansion.
- Create `apps/admin-panel/src/app/api/hot-radar/runs/route.ts`: manual job enqueue and current run summary.
- Create `apps/admin-panel/src/app/api/hot-radar/rankings/route.ts`: daily Top 20 query.
- Create `apps/admin-panel/src/app/api/hot-radar/score/route.ts`: deterministic score persistence plus DeepSeek explanations.
- Create `apps/admin-panel/src/app/api/hot-radar/products/[id]/route.ts`: select or ignore a candidate.
- Create `apps/admin-panel/src/app/api/hot-radar/notifications/test/route.ts`: one-channel test send.
- Create `apps/admin-panel/src/app/api/hot-radar/notifications/send/route.ts`: daily dual-channel send and independent delivery logs.
- Create `apps/admin-panel/src/app/api/hot-radar/api-utils.js`: request parsing and bounded enum/list validation shared only by radar routes.
- Create `apps/admin-panel/src/app/api/hot-radar/api-utils.test.js`: route input validation tests.
- Modify `apps/admin-panel/src/app/api/products/route.ts`: exclude radar candidates by default and preserve existing filters.
- Modify `apps/admin-panel/src/lib/settings-store.ts`: server-only WeCom and Feishu webhook fields.
- Modify `apps/admin-panel/src/app/api/settings/settings-utils.js`: secret-preserving update behavior and configured booleans.
- Modify `apps/admin-panel/src/app/api/settings/settings-utils.test.js`: webhook secret regression tests.

### Python worker

- Create `services/scraper/scrapers/ali1688_provider.py`: public search result and detail extraction behind one provider interface.
- Create `services/scraper/scrapers/supabase_queue.py`: REST/RPC queue client.
- Create `services/scraper/worker.py`: polling loop, per-offer isolation, throttling, retry classification, and completion reporting.
- Create `services/scraper/tests/fixtures/1688_search.html`: static public-result-shaped fixture without copied production content.
- Create `services/scraper/tests/fixtures/1688_blocked.html`: static login/CAPTCHA fixture.
- Create `services/scraper/tests/test_ali1688_provider.py`: parser, limit, and block detection tests.
- Create `services/scraper/tests/test_supabase_queue.py`: queue request/response tests using fake transports.
- Modify `services/scraper/requirements.txt`: add only `supabase` if REST helpers cannot remain on existing `httpx`; prefer existing `httpx` and add no package.
- Modify root `package.json`: add a `test:scraper` script and include it in full verification only after Python tests exist.

### n8n and UI

- Create `n8n-workflows/hot-radar-six-hour.json`: six-hour job enqueue.
- Create `n8n-workflows/hot-radar-daily-ranking.json`: daily score and notification sequence.
- Create `n8n-workflows/hot-radar-workflows.test.js`: JSON shape and schedule tests.
- Modify `n8n-workflows/README.md`: import steps and required environment variables.
- Create `apps/admin-panel/src/app/hot-radar/page.tsx`: keyword controls, run status, Top 20 table, candidate actions, and error states.
- Modify `apps/admin-panel/src/components/sidebar.tsx`: add the Hot Radar navigation entry.
- Modify `apps/admin-panel/src/app/settings/page.tsx`: WeCom and Feishu webhook inputs, saved-state labels, and test buttons.

---

### Task 1: Add the persistent radar schema and atomic queue claim

**Files:**
- Create: `packages/supabase-schema/migrations/20260624_hot_product_radar.sql`
- Modify: `packages/supabase-schema/README.md`

- [ ] **Step 1: Write the migration contract as executable SQL**

Create the migration with these exact persistence rules. Use `IF NOT EXISTS` for tables and indexes so rerunning the additive migration is safe; use guarded `ALTER TABLE` blocks for new product columns.

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS radar_state TEXT NOT NULL DEFAULT 'selected',
  ADD COLUMN IF NOT EXISTS source_keyword TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_radar_state_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_radar_state_check
      CHECK (radar_state IN ('candidate', 'selected', 'ignored'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_1688_external_id
  ON products(external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS monitor_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('seed', 'expanded')),
  parent_id UUID REFERENCES monitor_keywords(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(keyword)
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES monitor_keywords(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'paused')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(keyword_id, cycle_at)
);

CREATE TABLE IF NOT EXISTS product_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  crawl_job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  keyword TEXT NOT NULL,
  search_rank INTEGER,
  price NUMERIC(10,2),
  minimum_order INTEGER,
  supplier_signals JSONB NOT NULL DEFAULT '{}',
  raw_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, crawl_job_id)
);

CREATE TABLE IF NOT EXISTS hot_product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rank INTEGER NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  dimensions JSONB NOT NULL,
  xiaohongshu_price NUMERIC(10,2),
  xianyu_price NUMERIC(10,2),
  explanation TEXT NOT NULL DEFAULT '',
  channel_advice JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, score_date),
  UNIQUE(score_date, rank)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('wecom', 'feishu')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(score_date, channel)
);
```

- [ ] **Step 2: Add the atomic claim RPC and indexes**

```sql
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_claim
  ON crawl_jobs(status, cycle_at, created_at);
CREATE INDEX IF NOT EXISTS idx_observations_product_time
  ON product_observations(product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_scores_date_rank
  ON hot_product_scores(score_date DESC, rank);

CREATE OR REPLACE FUNCTION claim_crawl_job(worker_name TEXT)
RETURNS SETOF crawl_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE claimed_id UUID;
BEGIN
  SELECT id INTO claimed_id
  FROM crawl_jobs
  WHERE status = 'pending'
     OR (status = 'running' AND locked_at < NOW() - INTERVAL '10 minutes')
  ORDER BY cycle_at, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE crawl_jobs
  SET status = 'running', locked_by = worker_name, locked_at = NOW(),
      attempt_count = attempt_count + 1, error = NULL
  WHERE id = claimed_id
  RETURNING *;
END;
$$;
```

- [ ] **Step 3: Add RLS and service-role documentation**

Enable RLS on the four new state tables and delivery table. Add authenticated read-only policies for operator pages. All writes and the `claim_crawl_job` RPC are called server-side with the service role; do not create anonymous write policies.

```sql
ALTER TABLE monitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read monitor keywords"
  ON monitor_keywords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read crawl jobs"
  ON crawl_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read product observations"
  ON product_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read hot product scores"
  ON hot_product_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read notification deliveries"
  ON notification_deliveries FOR SELECT TO authenticated USING (true);

REVOKE ALL ON FUNCTION claim_crawl_job(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_crawl_job(TEXT) TO service_role;
```

- [ ] **Step 4: Validate SQL syntax in a disposable Supabase project or SQL Editor transaction**

Run base `packages/supabase-schema/schema.sql`, then the migration. Expected: all statements succeed and rerunning the radar migration does not fail.

```sql
SELECT to_regclass('public.monitor_keywords'),
       to_regclass('public.crawl_jobs'),
       to_regclass('public.product_observations'),
       to_regclass('public.hot_product_scores'),
       to_regclass('public.notification_deliveries');
```

Expected: all five values are non-null.

- [ ] **Step 5: Commit the schema task**

```bash
git add packages/supabase-schema/migrations/20260624_hot_product_radar.sql packages/supabase-schema/README.md
git commit -m "feat: add hot radar persistence schema"
```

### Task 2: Implement deterministic radar domain utilities

**Files:**
- Create: `apps/admin-panel/src/lib/hot-radar-utils.js`
- Create: `apps/admin-panel/src/lib/hot-radar-utils.test.js`

- [ ] **Step 1: Write failing keyword and score tests**

```js
const test = require("node:test")
const assert = require("node:assert/strict")
const {
  normalizeExpandedKeywords,
  scoreCandidate,
  confidenceForObservations,
  buildRadarMessage,
} = require("./hot-radar-utils")

test("normalizes and bounds keyword expansion", () => {
  assert.deepEqual(
    normalizeExpandedKeywords("桌面支架", [" 桌面支架 ", "手机支架", "手机支架", "折叠支架"], 2),
    ["手机支架", "折叠支架"]
  )
})

test("uses observation count for confidence", () => {
  assert.equal(confidenceForObservations(1, 1), "low")
  assert.equal(confidenceForObservations(3, 1), "medium")
  assert.equal(confidenceForObservations(28, 7), "high")
})

test("blocked candidates always score zero", () => {
  assert.equal(scoreCandidate({ blocked: true, observations: [] }).overallScore, 0)
})

test("calculates a stable weighted score", () => {
  const score = scoreCandidate({
    blocked: false,
    observations: [{ searchRank: 18 }, { searchRank: 11 }, { searchRank: 6 }],
    keywordCoverage: 3,
    duplicateCount: 2,
    cost: 20,
    suggestedPrice: 59,
    supplierScore: 8,
    contentFit: 4,
  })
  assert.deepEqual(score.dimensions, {
    trend: 35,
    demand: 18,
    competition: 12,
    margin: 15,
    supplier: 8,
    contentCompliance: 4,
  })
  assert.equal(score.overallScore, 92)
})

test("builds equivalent WeCom and Feishu summaries", () => {
  const payload = buildRadarMessage("2026-06-24", [{ rank: 1, name: "折叠支架", overall_score: 92 }])
  assert.match(payload.text, /2026-06-24/)
  assert.match(payload.text, /折叠支架/)
})
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `node --test apps/admin-panel/src/lib/hot-radar-utils.test.js`

Expected: FAIL with `Cannot find module './hot-radar-utils'`.

- [ ] **Step 3: Implement the minimal pure functions**

```js
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeExpandedKeywords(seed, values, limit = 5) {
  const normalizedSeed = String(seed || "").trim().toLowerCase()
  return [...new Set((values || []).map(v => String(v).trim()).filter(Boolean))]
    .filter(v => v.toLowerCase() !== normalizedSeed)
    .slice(0, limit)
}

function confidenceForObservations(count, distinctDays) {
  if (count >= 28 && distinctDays >= 7) return "high"
  if (count >= 3) return "medium"
  return "low"
}

function scoreCandidate(input) {
  if (input.blocked) return { overallScore: 0, confidence: "low", dimensions: {} }
  const observations = input.observations || []
  const first = observations[0]?.searchRank
  const last = observations[observations.length - 1]?.searchRank
  const trend = first && last ? clamp((first - last) * 7, 0, 35) : 0
  const demand = clamp((input.keywordCoverage || 0) * 4 + Math.max(0, 10 - (last || 10)) * 1.5, 0, 20)
  const competition = clamp(15 - (input.duplicateCount || 0) * 1.5, 0, 15)
  const ratio = input.suggestedPrice > 0 && input.cost != null
    ? (input.suggestedPrice - input.cost) / input.suggestedPrice : 0
  const margin = ratio >= 0.6 ? 15 : ratio >= 0.45 ? 12 : ratio >= 0.3 ? 8 : ratio > 0 ? 3 : 0
  const dimensions = {
    trend,
    demand,
    competition,
    margin,
    supplier: clamp(input.supplierScore || 0, 0, 10),
    contentCompliance: clamp(input.contentFit || 0, 0, 5),
  }
  return {
    dimensions,
    overallScore: Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) * 100) / 100,
  }
}

function buildRadarMessage(date, rankings) {
  return { text: [`1688 爆品潜力榜 ${date}`, ...rankings.slice(0, 20).map(item => `${item.rank}. ${item.name} - ${item.overall_score}`)].join("\n") }
}

module.exports = { normalizeExpandedKeywords, confidenceForObservations, scoreCandidate, buildRadarMessage }
```

- [ ] **Step 4: Run all Node tests**

Run: `npm test`

Expected: existing tests and all new hot-radar utility tests PASS.

- [ ] **Step 5: Commit the utilities**

```bash
git add apps/admin-panel/src/lib/hot-radar-utils.js apps/admin-panel/src/lib/hot-radar-utils.test.js
git commit -m "feat: add deterministic hot radar scoring"
```

### Task 3: Add keyword, job, ranking, and candidate APIs

**Files:**
- Create: `apps/admin-panel/src/app/api/hot-radar/api-utils.js`
- Create: `apps/admin-panel/src/app/api/hot-radar/api-utils.test.js`
- Create: `apps/admin-panel/src/app/api/hot-radar/keywords/route.ts`
- Create: `apps/admin-panel/src/app/api/hot-radar/runs/route.ts`
- Create: `apps/admin-panel/src/app/api/hot-radar/rankings/route.ts`
- Create: `apps/admin-panel/src/app/api/hot-radar/products/[id]/route.ts`
- Modify: `apps/admin-panel/src/app/api/products/route.ts`

- [ ] **Step 1: Write failing API validation tests**

```js
const test = require("node:test")
const assert = require("node:assert/strict")
const { parseSeedKeywords, parseCandidateAction, cycleStart, hasValidInternalToken } = require("./api-utils")

test("accepts at most ten unique seed keywords", () => {
  assert.deepEqual(parseSeedKeywords(["支架", "杯子", "支架"]), ["支架", "杯子"])
  assert.throws(() => parseSeedKeywords(Array.from({ length: 11 }, (_, i) => `词${i}`)), /最多 10/)
})

test("only accepts candidate state transitions", () => {
  assert.equal(parseCandidateAction("select"), "selected")
  assert.equal(parseCandidateAction("ignore"), "ignored")
  assert.throws(() => parseCandidateAction("publish"), /不支持/)
})

test("rounds cycles to six-hour UTC windows", () => {
  assert.equal(cycleStart(new Date("2026-06-24T08:35:00Z")).toISOString(), "2026-06-24T06:00:00.000Z")
})

test("validates the internal automation bearer token", () => {
  assert.equal(hasValidInternalToken("Bearer radar-secret", "radar-secret"), true)
  assert.equal(hasValidInternalToken("Bearer wrong", "radar-secret"), false)
  assert.equal(hasValidInternalToken(null, "radar-secret"), false)
})
```

- [ ] **Step 2: Run the validation test and verify failure**

Run: `node --test apps/admin-panel/src/app/api/hot-radar/api-utils.test.js`

Expected: FAIL because `api-utils.js` does not exist.

- [ ] **Step 3: Implement exact validation helpers**

```js
function parseSeedKeywords(values) {
  if (!Array.isArray(values)) throw new Error("keywords 必须是数组")
  const keywords = [...new Set(values.map(value => String(value).trim()).filter(Boolean))]
  if (keywords.length > 10) throw new Error("最多 10 个种子关键词")
  if (keywords.some(value => value.length > 40)) throw new Error("关键词不能超过 40 个字符")
  return keywords
}

function parseCandidateAction(value) {
  if (value === "select") return "selected"
  if (value === "ignore") return "ignored"
  throw new Error("不支持的候选商品操作")
}

function cycleStart(date) {
  const value = new Date(date)
  value.setUTCMinutes(0, 0, 0)
  value.setUTCHours(Math.floor(value.getUTCHours() / 6) * 6)
  return value
}

function hasValidInternalToken(header, expected) {
  return Boolean(expected && header === `Bearer ${expected}`)
}

module.exports = { parseSeedKeywords, parseCandidateAction, cycleStart, hasValidInternalToken }
```

- [ ] **Step 4: Implement keyword replacement**

`GET /api/hot-radar/keywords` returns seed words with nested expanded words. `POST` accepts `{ keywords: string[] }`, validates with `parseSeedKeywords`, upserts seeds, and disables omitted seeds instead of deleting history. Return 503 when Supabase is not configured; do not use mock data for radar state.

- [ ] **Step 5: Implement idempotent manual enqueue and run summary**

`POST /api/hot-radar/runs` computes `cycleStart(new Date())`, queries enabled seed and expanded keywords, and upserts jobs on `keyword_id,cycle_at` with `ignoreDuplicates: true`. `GET` returns counts grouped into pending, running, succeeded, failed, plus latest and next run timestamps.

Use this response contract:

```ts
type RadarRunSummary = {
  cycleAt: string | null
  nextRunAt: string
  counts: { pending: number; running: number; succeeded: number; failed: number }
  latestErrors: Array<{ keyword: string; error: string; attemptCount: number }>
}
```

- [ ] **Step 6: Implement Top 20 and candidate actions**

`GET /api/hot-radar/rankings?date=YYYY-MM-DD` selects `hot_product_scores` joined to products, orders by rank, and limits 20. `PATCH /api/hot-radar/products/[id]` maps `select` to `radar_state=selected` and `ignore` to `radar_state=ignored`; no route supports publishing.

- [ ] **Step 7: Keep candidates out of the existing product pool**

Add this default condition before existing search/category/status conditions:

```ts
let query = supabase.from("products").select("*").neq("radar_state", "candidate").neq("radar_state", "ignored")
```

For pre-migration compatibility, if Supabase returns a missing-column error for `radar_state`, return a clear schema initialization error rather than silently returning mock data.

- [ ] **Step 8: Run tests, lint, and commit**

Run: `npm test && npm run lint`

Expected: all tests PASS and Turbo reports all lint/type-check tasks successful.

```bash
git add apps/admin-panel/src/app/api/hot-radar apps/admin-panel/src/app/api/products/route.ts
git commit -m "feat: add hot radar state APIs"
```

### Task 4: Add bounded DeepSeek expansion and daily scoring persistence

**Files:**
- Create: `apps/admin-panel/src/app/api/hot-radar/expand/route.ts`
- Create: `apps/admin-panel/src/app/api/hot-radar/score/route.ts`
- Modify: `apps/admin-panel/src/lib/hot-radar-utils.js`
- Modify: `apps/admin-panel/src/lib/hot-radar-utils.test.js`

- [ ] **Step 1: Add a failing strict expansion parser test**

```js
test("parses a strict keyword expansion object", () => {
  assert.deepEqual(parseKeywordExpansion('{"keywords":["折叠支架","桌面神器"]}'), ["折叠支架", "桌面神器"])
  assert.throws(() => parseKeywordExpansion("not json"), /JSON/)
})
```

- [ ] **Step 2: Implement `parseKeywordExpansion` and rerun the focused test**

Require a JSON object with a `keywords` array, trim entries, remove duplicates, and reject non-string values. Do not parse Markdown prose.

Run: `node --test apps/admin-panel/src/lib/hot-radar-utils.test.js`

Expected: PASS.

- [ ] **Step 3: Implement expansion route**

Require configured DeepSeek credentials. Send only the seed text and request at most five purchasing-intent synonyms/long-tail phrases. Parse through `parseKeywordExpansion`, then `normalizeExpandedKeywords(seed, values, 5)`. Upsert expanded rows with the seed `parent_id`; never let an LLM update seed rows or exceed the limit.

- [ ] **Step 4: Implement score candidate query and persistence**

For each non-blocked, non-ignored candidate observed in the last 30 days:

1. Load ordered observations and distinct keyword count.
2. Calculate suggested prices with deterministic multipliers (`xiaohongshu = cost * 2.8`, `xianyu = cost * 2.2`) rounded to two decimals.
3. Calculate numeric dimensions using `scoreCandidate`.
4. Set confidence using observation count and distinct observation dates.
5. Sort by score descending and a stable `product_id` tie-breaker.
6. Upsert only the first 20 with ranks 1 through 20 for the requested date.

- [ ] **Step 5: Add explanation after numbers are persisted**

Send DeepSeek the product name, collected facts, persisted dimensions, score, confidence, and both suggested prices. Require JSON `{ "explanation": string, "xiaohongshu": string, "xianyu": string }`. Update only `explanation` and `channel_advice`; never accept `rank`, `overall_score`, or `dimensions` from the model response.

- [ ] **Step 6: Verify score idempotency**

Call `POST /api/hot-radar/score` twice with `{ "date": "2026-06-24" }` against test data. Expected: exactly one score row per product/date and ranks 1 through at most 20 with no duplicates.

- [ ] **Step 7: Run and commit**

Run: `npm test && npm run lint`

```bash
git add apps/admin-panel/src/lib/hot-radar-utils.js apps/admin-panel/src/lib/hot-radar-utils.test.js apps/admin-panel/src/app/api/hot-radar/expand/route.ts apps/admin-panel/src/app/api/hot-radar/score/route.ts
git commit -m "feat: add keyword expansion and daily ranking"
```

### Task 5: Add server-only WeCom and Feishu notifications

**Files:**
- Modify: `apps/admin-panel/src/lib/settings-store.ts`
- Modify: `apps/admin-panel/src/app/api/settings/settings-utils.js`
- Modify: `apps/admin-panel/src/app/api/settings/settings-utils.test.js`
- Create: `apps/admin-panel/src/app/api/hot-radar/notifications/test/route.ts`
- Create: `apps/admin-panel/src/app/api/hot-radar/notifications/send/route.ts`

- [ ] **Step 1: Write failing secret-preservation tests**

```js
test("public settings hide notification webhooks", () => {
  const result = publicSettings({ wecomWebhookUrl: "https://qyapi.weixin.qq.com/a", feishuWebhookUrl: "https://open.feishu.cn/b" })
  assert.equal(result.wecomWebhookUrl, "")
  assert.equal(result.feishuWebhookUrl, "")
  assert.equal(result.wecomConfigured, true)
  assert.equal(result.feishuConfigured, true)
})

test("blank webhook submissions preserve saved secrets", () => {
  const patch = settingsPatchFromBody({ wecomWebhookUrl: "", feishuWebhookUrl: "" })
  assert.equal("wecomWebhookUrl" in patch, false)
  assert.equal("feishuWebhookUrl" in patch, false)
})
```

- [ ] **Step 2: Run settings tests and verify failure**

Run: `node --test apps/admin-panel/src/app/api/settings/settings-utils.test.js`

Expected: FAIL because webhook fields/configured booleans are missing.

- [ ] **Step 3: Extend server settings safely**

Add `wecomWebhookUrl` and `feishuWebhookUrl` to the settings interface and persisted store. Read optional `WECOM_WEBHOOK_URL` and `FEISHU_WEBHOOK_URL` environment values first. Never return full values from `GET /api/settings`.

- [ ] **Step 4: Implement channel-specific payloads and test route**

WeCom request body:

```json
{ "msgtype": "text", "text": { "content": "1688 爆品雷达测试消息" } }
```

Feishu request body:

```json
{ "msg_type": "text", "content": { "text": "1688 爆品雷达测试消息" } }
```

`POST /notifications/test` accepts `{ "channel": "wecom" | "feishu" }`, loads the server secret, sends one clearly marked test message, and returns the upstream status without echoing the URL.

- [ ] **Step 5: Implement independent daily sends**

`POST /notifications/send` accepts a date, loads that day's Top 20, calls `buildRadarMessage`, and processes WeCom and Feishu independently. Upsert a delivery row before each send, increment `attempt_count`, and update `sent` or `failed`. A failed channel must not change the other channel or trigger rescoring.

- [ ] **Step 6: Test with local fake webhook endpoints**

Use a tiny local HTTP test server that records JSON bodies. Expected: both channel payloads contain the same date and ranking text, secrets never appear in API responses, and one channel returning 500 leaves the other `sent`.

- [ ] **Step 7: Run and commit**

Run: `npm test && npm run lint`

```bash
git add apps/admin-panel/src/lib/settings-store.ts apps/admin-panel/src/app/api/settings/settings-utils.js apps/admin-panel/src/app/api/settings/settings-utils.test.js apps/admin-panel/src/app/api/hot-radar/notifications
git commit -m "feat: add hot radar notifications"
```

### Task 6: Build the public-page 1688 provider

**Files:**
- Create: `services/scraper/scrapers/ali1688_provider.py`
- Create: `services/scraper/tests/fixtures/1688_search.html`
- Create: `services/scraper/tests/fixtures/1688_blocked.html`
- Create: `services/scraper/tests/test_ali1688_provider.py`

- [ ] **Step 1: Write failing fixture parser tests**

```python
import unittest
from pathlib import Path
from scrapers.ali1688_provider import parse_search_html, AccessBlocked

FIXTURES = Path(__file__).parent / "fixtures"

class Ali1688ProviderTests(unittest.TestCase):
    def test_parses_and_limits_public_offer_links(self):
        html = (FIXTURES / "1688_search.html").read_text(encoding="utf-8")
        offers = parse_search_html(html, limit=2)
        self.assertEqual([item["offer_id"] for item in offers], ["10001", "10002"])
        self.assertEqual(len(offers), 2)

    def test_detects_login_or_captcha_block(self):
        html = (FIXTURES / "1688_blocked.html").read_text(encoding="utf-8")
        with self.assertRaises(AccessBlocked):
            parse_search_html(html, limit=50)
```

- [ ] **Step 2: Run and verify import failure**

Run from `services/scraper`: `python -m unittest discover -s tests -v`

Expected: FAIL because `scrapers.ali1688_provider` is missing.

- [ ] **Step 3: Implement provider types and block detection**

```python
class AccessBlocked(RuntimeError):
    pass

BLOCK_MARKERS = ("验证码", "登录后查看", "安全验证", "captcha")

def parse_search_html(html: str, limit: int = 50) -> list[dict]:
    lowered = html.lower()
    if any(marker.lower() in lowered for marker in BLOCK_MARKERS):
        raise AccessBlocked("1688 public page requires login or verification")
    # Parse anchors with BeautifulSoup; accept only exact detail.1688.com/offer/<digits>.html URLs.
    # Deduplicate by offer_id and stop at min(limit, 50).
```

- [ ] **Step 4: Implement async search and detail collection**

Expose:

```python
import asyncio
import random
from urllib.parse import quote_plus
from playwright.async_api import async_playwright
from scrapers.link_parser import parse_link

class Ali1688Provider:
    async def search(self, keyword: str, limit: int = 50) -> list[dict]:
        url = f"https://s.1688.com/selloffer/offer_search.htm?keywords={quote_plus(keyword)}"
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                return parse_search_html(await page.content(), limit=min(limit, 50))
            finally:
                await browser.close()

    async def fetch_offer(self, url: str, keyword: str, search_rank: int) -> dict:
        await asyncio.sleep(random.uniform(2, 5))
        product = await parse_link(url)
        if not product:
            raise RuntimeError("1688 offer could not be parsed")
        product["keyword"] = keyword
        product["search_rank"] = search_rank
        return product
```

Use Playwright Chromium, `domcontentloaded`, one page at a time, a 30-second timeout, and a randomized 2-5 second delay between detail requests. Reuse the existing cleaner and safety filter. Return `offer_id`, normalized product fields, `search_rank`, `minimum_order`, `supplier_signals`, and `raw_metrics`. Do not add stealth plugins or CAPTCHA solvers.

- [ ] **Step 5: Run Python tests**

Run: `cd services/scraper && python -m unittest discover -s tests -v`

Expected: parser limit and access-block tests PASS without network access.

- [ ] **Step 6: Commit provider work**

```bash
git add services/scraper/scrapers/ali1688_provider.py services/scraper/tests
git commit -m "feat: add public 1688 search provider"
```

### Task 7: Implement the Supabase-backed Python worker

**Files:**
- Create: `services/scraper/scrapers/supabase_queue.py`
- Create: `services/scraper/worker.py`
- Create: `services/scraper/tests/test_supabase_queue.py`
- Modify: `services/scraper/README.md`
- Modify: `package.json`

- [ ] **Step 1: Write failing queue client tests with `httpx.MockTransport`**

Test these contracts:

```python
job = queue.claim("worker-1")
self.assertEqual(job["status"], "running")
queue.complete(job["id"], processed_count=12, failed_count=1)
queue.fail(job["id"], "public page blocked", retryable=False)
```

Assert that claim calls `/rest/v1/rpc/claim_crawl_job`, complete sets `succeeded`, and a non-retryable block sets `failed` with the error text. Verify Authorization and apikey headers are present without asserting or logging their values.

- [ ] **Step 2: Run the queue tests and verify failure**

Run: `cd services/scraper && python -m unittest discover -s tests -v`

Expected: FAIL because `supabase_queue.py` is missing.

- [ ] **Step 3: Implement the queue client with existing `httpx`**

```python
import httpx
from datetime import datetime, timezone

class SupabaseQueue:
    def __init__(self, url: str, service_key: str, transport=None):
        self.client = httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
            },
            timeout=20,
            transport=transport,
        )

    def claim(self, worker_name: str) -> dict | None:
        response = self.client.post("/rpc/claim_crawl_job", json={"worker_name": worker_name})
        response.raise_for_status()
        rows = response.json()
        return rows[0] if rows else None

    def get_keyword(self, keyword_id: str) -> dict:
        response = self.client.get("/monitor_keywords", params={"id": f"eq.{keyword_id}", "select": "*"})
        response.raise_for_status()
        rows = response.json()
        if not rows:
            raise RuntimeError("crawl job keyword was not found")
        return rows[0]

    def upsert_product(self, product: dict) -> dict:
        response = self.client.post(
            "/products",
            params={"on_conflict": "external_id", "select": "*"},
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            json=product,
        )
        response.raise_for_status()
        return response.json()[0]

    def insert_observation(self, observation: dict) -> None:
        response = self.client.post(
            "/product_observations",
            params={"on_conflict": "product_id,crawl_job_id"},
            headers={"Prefer": "resolution=ignore-duplicates"},
            json=observation,
        )
        response.raise_for_status()

    def complete(self, job_id: str, processed_count: int, failed_count: int) -> None:
        response = self.client.patch(
            "/crawl_jobs",
            params={"id": f"eq.{job_id}"},
            json={
                "status": "succeeded",
                "processed_count": processed_count,
                "failed_count": failed_count,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        response.raise_for_status()

    def fail(self, job_id: str, message: str, retryable: bool) -> None:
        response = self.client.patch(
            "/crawl_jobs",
            params={"id": f"eq.{job_id}"},
            json={"status": "pending" if retryable else "failed", "error": message[:500]},
        )
        response.raise_for_status()
```

Keep all REST calls bounded by a 20-second timeout. Never print headers, service keys, or full environment dictionaries.

- [ ] **Step 4: Implement one-job worker execution**

`worker.py --once` must:

1. Validate `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Claim one job.
3. Load its keyword.
4. Search up to 50 offers.
5. Fetch each offer independently.
6. Skip blocked products after the existing safety filter.
7. Upsert candidate products with `radar_state=candidate` and unique `external_id`.
8. Insert one observation per product/job.
9. Complete the job with processed and failed counts.
10. On `AccessBlocked`, fail the job as non-retryable and increment the keyword failure state.

`worker.py` without `--once` polls every 10 seconds and handles only one job at a time.

- [ ] **Step 5: Add root Python test command**

```json
"test:scraper": "cd services/scraper && python -m unittest discover -s tests -v"
```

Do not replace the existing Node `test` script; full verification runs both commands explicitly.

- [ ] **Step 6: Run tests and a no-job smoke test**

Run:

```bash
npm test
npm run test:scraper
cd services/scraper && python worker.py --once
```

Expected: tests PASS; with an empty queue the worker exits 0 and prints only a concise `no pending jobs` message.

- [ ] **Step 7: Commit worker work**

```bash
git add services/scraper/scrapers/supabase_queue.py services/scraper/worker.py services/scraper/tests/test_supabase_queue.py services/scraper/README.md package.json
git commit -m "feat: add Supabase radar worker"
```

### Task 8: Add six-hour and daily n8n workflows

**Files:**
- Create: `n8n-workflows/hot-radar-six-hour.json`
- Create: `n8n-workflows/hot-radar-daily-ranking.json`
- Create: `n8n-workflows/hot-radar-workflows.test.js`
- Modify: `n8n-workflows/README.md`
- Modify: `package.json`
- Modify: `apps/admin-panel/src/app/api/hot-radar/api-utils.js`
- Modify: `apps/admin-panel/src/app/api/hot-radar/api-utils.test.js`
- Modify: `apps/admin-panel/src/app/api/hot-radar/score/route.ts`
- Modify: `apps/admin-panel/src/app/api/hot-radar/notifications/send/route.ts`

- [ ] **Step 1: Write failing workflow JSON tests**

```js
const test = require("node:test")
const assert = require("node:assert/strict")
const sixHour = require("./hot-radar-six-hour.json")
const daily = require("./hot-radar-daily-ranking.json")

test("six-hour workflow uses a six-hour schedule", () => {
  const trigger = sixHour.nodes.find(node => node.type === "n8n-nodes-base.scheduleTrigger")
  assert.equal(trigger.parameters.rule.interval[0].field, "hours")
  assert.equal(trigger.parameters.rule.interval[0].hoursInterval, 6)
})

test("daily workflow scores before sending notifications", () => {
  const urls = daily.nodes.filter(node => node.type === "n8n-nodes-base.httpRequest").map(node => node.parameters.url)
  assert.deepEqual(urls, [
    "={{$env.ADMIN_PANEL_URL}}/api/hot-radar/score",
    "={{$env.ADMIN_PANEL_URL}}/api/hot-radar/notifications/send",
  ])
})
```

- [ ] **Step 2: Run and verify missing workflow failure**

Run: `node --test n8n-workflows/hot-radar-workflows.test.js`

Expected: FAIL because the JSON files do not exist.

- [ ] **Step 3: Create inactive workflow exports**

The six-hour workflow contains one schedule trigger and one authenticated HTTP request to `POST /api/hot-radar/runs`. The daily workflow runs once each morning, calls `POST /score`, and only after success calls `POST /notifications/send`. Both JSON files remain `"active": false` until imported and credentials are configured.

- [ ] **Step 4: Add workflow tests to root test script**

Extend the existing Node test command with `n8n-workflows/*.test.js`; preserve all current test globs.

- [ ] **Step 5: Enforce and document n8n authentication and URLs**

Document `ADMIN_PANEL_URL` and `RADAR_INTERNAL_TOKEN`. At the start of scheduled score/send handlers, reject missing or invalid tokens before reading request bodies or database state:

```ts
const tokenIsValid = hasValidInternalToken(
  req.headers.get("authorization"),
  process.env.RADAR_INTERNAL_TOKEN
)
if (!tokenIsValid) return apiError("Unauthorized", 401)
```

The n8n HTTP nodes send `Authorization: Bearer {{$env.RADAR_INTERNAL_TOKEN}}`. Manual same-origin UI calls use only the manual enqueue endpoint; scheduled score/send routes always require the token.

- [ ] **Step 6: Run and commit**

Run: `npm test`

```bash
git add n8n-workflows/hot-radar-six-hour.json n8n-workflows/hot-radar-daily-ranking.json n8n-workflows/hot-radar-workflows.test.js n8n-workflows/README.md package.json apps/admin-panel/src/app/api/hot-radar/api-utils.js apps/admin-panel/src/app/api/hot-radar/api-utils.test.js apps/admin-panel/src/app/api/hot-radar/score/route.ts apps/admin-panel/src/app/api/hot-radar/notifications/send/route.ts
git commit -m "feat: add hot radar automation workflows"
```

### Task 9: Build the Hot Radar operator UI and settings controls

**Files:**
- Create: `apps/admin-panel/src/app/hot-radar/page.tsx`
- Modify: `apps/admin-panel/src/components/sidebar.tsx`
- Modify: `apps/admin-panel/src/app/settings/page.tsx`

- [ ] **Step 1: Add the sidebar route**

Import `Radar` from `lucide-react` and add `{ href: "/hot-radar", label: "爆品雷达", icon: Radar }` after 产品池. Do not rearrange other navigation items.

- [ ] **Step 2: Implement complete loading, empty, error, and populated states**

The page loads `/keywords`, `/runs`, and `/rankings` in parallel. Render:

- Up to 10 seed inputs and nested expanded keyword toggles.
- Monitoring state, last run, next run, and pending/running/succeeded/failed counts.
- One `一键采集` button that posts `/runs` and refreshes the run summary.
- A Top 20 table with rank, name, score, confidence, 24-hour/7-day trend labels, cost, channel prices, and actions.
- An explicit database-schema error when APIs return 503/500; never replace radar results with mock data.

Use the existing `Card`, `Button`, `Input`, and `Badge` components. Keep headings at `text-2xl`; use a horizontally scrollable table container on mobile instead of shrinking columns into unreadable text.

- [ ] **Step 3: Add candidate actions**

`加入产品池` PATCHes `{ action: "select" }`; `忽略` PATCHes `{ action: "ignore" }`. After success, remove only that row from the current radar view or update its state. The existing content generation path may be linked only after selection; do not add an automatic publish action.

- [ ] **Step 4: Add webhook settings controls**

Add password inputs for WeCom and Feishu Webhook URLs, configured-state labels, save behavior that preserves blank secrets, and separate test buttons. Display API errors as human-readable text and handle non-JSON responses safely.

- [ ] **Step 5: Run lint and production build**

Run:

```bash
npm run lint
npm run build
```

Expected: both exit 0. Record the known Next.js lockfile patch warning separately if it persists; do not classify it as a build failure when the command exits 0.

- [ ] **Step 6: Commit UI work**

```bash
git add apps/admin-panel/src/app/hot-radar/page.tsx apps/admin-panel/src/components/sidebar.tsx apps/admin-panel/src/app/settings/page.tsx
git commit -m "feat: add hot product radar UI"
```

### Task 10: Run end-to-end verification and operational handoff

**Files:**
- Modify only if verification exposes a scoped defect; use TDD for every fix.

- [ ] **Step 1: Run all automated verification**

```bash
npm test
npm run test:scraper
npm run lint
npm run build
```

Expected: all commands exit 0 with zero test failures.

- [ ] **Step 2: Verify database state**

Run base schema then migration in Supabase. Verify the five radar tables and `claim_crawl_job` RPC exist. Insert two seed keywords and confirm duplicate keyword and duplicate job-cycle constraints reject duplicates.

- [ ] **Step 3: Verify worker flow with one public keyword**

Create one job, run `python worker.py --once`, and verify:

- job becomes `succeeded` or a structured non-retryable `failed` if 1688 blocks public access;
- processed count never exceeds 50;
- no duplicate `external_id` products;
- no duplicate product/job observations;
- no CAPTCHA or login bypass behavior occurs.

- [ ] **Step 4: Create three controlled observation snapshots**

Use deterministic test fixture observations for one candidate and run daily scoring. Expected: first snapshot confidence `low`, third snapshot `medium`, and 28 observations across seven dates `high`. Verify DeepSeek explanation updates text fields but leaves numeric dimensions unchanged.

- [ ] **Step 5: Verify notifications using test webhooks**

Configure controlled WeCom/Feishu endpoints, send a test, then run daily send. Expected: both messages include the same date and Top 20 order; one endpoint failure produces only one failed delivery record and does not rerun scoring.

- [ ] **Step 6: Browser verification at desktop and mobile widths**

Start the app and keep it running:

```bash
npm run dev
```

Test `http://localhost:3001/hot-radar` at 1280x720 and 390x844. Verify keyword save, expansion, one-click enqueue, loading, empty, error, populated ranking, selection, ignore, refresh persistence, table overflow, and no text overlap. Verify settings save and test sends. Verify no browser console errors during the core flow.

- [ ] **Step 7: Review security boundaries**

Confirm API responses and browser logs never expose Service Role Key, DeepSeek Key, WeCom URL, Feishu URL, or `RADAR_INTERNAL_TOKEN`. Confirm n8n score/send endpoints reject a missing or invalid bearer token. Confirm no route can auto-publish or purchase.

- [ ] **Step 8: Commit only scoped verification fixes**

If no defects are found, do not create an empty commit. If fixes are needed, stage exact files and use:

```bash
git commit -m "fix: complete hot radar verification"
```

## Final Delivery Checklist

- Base Supabase schema and radar migration executed.
- Seed keyword, expansion, enqueue, claim, collection, observation, score, explanation, ranking, and notification flow verified.
- Public-page blocking produces a visible structured failure instead of bypass behavior.
- Top 20 persists through refresh and service restart.
- Existing product pool, AI scoring, content generation, and review queue remain functional.
- Every generated content item still enters 人工审核; no radar path can publish automatically.
- Existing unrelated UTF-8 subprocess changes are either separately committed by their owner or remain untouched.
