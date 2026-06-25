# Cross-Platform Hot Product Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working slice of the cross-platform hot product workflow: trend candidates, 1688 supply verification status, hot radar scoring, and promotion into the existing product pool.

**Architecture:** Add an in-memory/file-backed trend candidate store that mirrors the existing local fallback pattern used by products. Expose focused API routes for listing, creating, importing, verifying supply, scoring, and promoting candidates, then add a Trend Candidates page and update Hot Radar to use candidate scores instead of 1688 keyword jobs.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, existing UI components, Node test runner.

---

## File Structure

- Create `apps/admin-panel/src/lib/trend-candidates-store.ts`: trend candidate types, seed data, cache persistence, scoring, supply verification, promotion payload helpers.
- Create `apps/admin-panel/src/lib/trend-candidates-store.test.js`: focused unit tests for candidate creation, supply failure handling, scoring, and promotion payload generation.
- Create `apps/admin-panel/src/app/api/trend-candidates/route.ts`: list and create trend candidates.
- Create `apps/admin-panel/src/app/api/trend-candidates/import/route.ts`: CSV-style bulk import from JSON rows.
- Create `apps/admin-panel/src/app/api/trend-candidates/[id]/verify-supply/route.ts`: mark 1688 supply verification as matched or needs manual review.
- Create `apps/admin-panel/src/app/api/trend-candidates/[id]/score/route.ts`: score one candidate.
- Create `apps/admin-panel/src/app/api/trend-candidates/[id]/promote-to-product/route.ts`: convert verified candidate into product pool item.
- Create `apps/admin-panel/src/app/trend-candidates/page.tsx`: candidate pool UI.
- Modify `apps/admin-panel/src/app/api/hot-radar/rankings/route.ts`: return scored trend candidates.
- Modify `apps/admin-panel/src/app/hot-radar/page.tsx`: show cross-platform evidence, supply status, recommended action, and promote button.
- Modify `apps/admin-panel/src/components/sidebar.tsx`: add Trend Candidates nav item.
- Modify `package.json`: include the new JS test file in `npm test`.

---

### Task 1: Trend Candidate Store

**Files:**
- Create: `apps/admin-panel/src/lib/trend-candidates-store.ts`
- Test: `apps/admin-panel/src/lib/trend-candidates-store.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write tests for store behavior**

Create `apps/admin-panel/src/lib/trend-candidates-store.test.js` with tests that import the compiled JS mirror if available or use exported CommonJS helpers after TypeScript build is not required. Test cases:

```js
const test = require("node:test")
const assert = require("node:assert/strict")

const {
  normalizeCandidateInput,
  calculateCandidateScore,
  buildPromotionProduct,
  verifySupplyFromInput,
} = require("./trend-candidates-store")

test("normalizes a cross-platform candidate", () => {
  const candidate = normalizeCandidateInput({
    title: "桌面理线收纳盒",
    platform: "xiaohongshu",
    sourceUrl: "https://example.com/note/1",
    heat: 82,
    growth: 31,
    priceBand: "29-59",
    keywords: ["收纳", "桌面"],
  })

  assert.equal(candidate.name, "桌面理线收纳盒")
  assert.equal(candidate.platform, "xiaohongshu")
  assert.equal(candidate.status, "new")
  assert.deepEqual(candidate.keywords, ["收纳", "桌面"])
})

test("supply verification fails when required 1688 evidence is missing", () => {
  const result = verifySupplyFromInput({ url: "https://detail.1688.com/offer/123.html", title: "", price: null })
  assert.equal(result.status, "needs_manual_review")
  assert.match(result.reason, /商品名|价格/)
})

test("scores candidate from trend, supply, profit, content, and risk", () => {
  const score = calculateCandidateScore({
    heat: 80,
    growth: 40,
    supplyStatus: "matched",
    supplyPrice: 12,
    suggestedPrice: 49,
    contentFit: 8,
    riskLevel: "safe",
  })

  assert.equal(score.total > 70, true)
  assert.equal(score.recommendedAction, "test_listing")
})

test("builds product payload only from verified candidate", () => {
  const product = buildPromotionProduct({
    id: "c1",
    name: "桌面理线收纳盒",
    description: "多平台升温商品",
    category: "home",
    keywords: ["收纳"],
    supply: { status: "matched", url: "https://detail.1688.com/offer/123.html", price: 12 },
    score: { total: 82 },
  })

  assert.equal(product.name, "桌面理线收纳盒")
  assert.equal(product.source, "hot_radar")
  assert.equal(product.cost, 12)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`

Expected: FAIL because `trend-candidates-store` does not exist.

- [ ] **Step 3: Implement the store**

Create `apps/admin-panel/src/lib/trend-candidates-store.ts` with:

- `TrendCandidate`, `SupplyMatch`, and `CandidateScore` types.
- Seed candidates from Xiaohongshu, Xianyu, and marketplace examples.
- `normalizeCandidateInput(input)`.
- `verifySupplyFromInput(input)`.
- `calculateCandidateScore(input)`.
- `buildPromotionProduct(candidate)`.
- `listCandidates()`, `createCandidate()`, `bulkImportCandidates()`, `verifyCandidateSupply()`, `scoreCandidate()`, `promoteCandidate()`.

Implementation rules:

- Missing 1688 title or price returns `needs_manual_review`.
- Scoring requires trend evidence and supply evidence.
- Promotion throws if supply status is not `matched`.

- [ ] **Step 4: Add test command coverage**

Modify root `package.json` test script to include:

```json
"test": "node --test apps/admin-panel/src/lib/*.test.js apps/admin-panel/src/app/api/settings/*.test.js"
```

This already matches the current glob, so no change is needed unless the file extension or location differs.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS, including the new store tests.

---

### Task 2: Trend Candidate APIs

**Files:**
- Create: `apps/admin-panel/src/app/api/trend-candidates/route.ts`
- Create: `apps/admin-panel/src/app/api/trend-candidates/import/route.ts`
- Create: `apps/admin-panel/src/app/api/trend-candidates/[id]/verify-supply/route.ts`
- Create: `apps/admin-panel/src/app/api/trend-candidates/[id]/score/route.ts`
- Create: `apps/admin-panel/src/app/api/trend-candidates/[id]/promote-to-product/route.ts`

- [ ] **Step 1: Implement list and create API**

`GET /api/trend-candidates` returns `{ rows }`.

`POST /api/trend-candidates` accepts:

```json
{
  "title": "桌面理线收纳盒",
  "platform": "xiaohongshu",
  "sourceUrl": "https://example.com/note/1",
  "heat": 82,
  "growth": 31,
  "priceBand": "29-59",
  "keywords": ["收纳", "桌面"]
}
```

- [ ] **Step 2: Implement import API**

`POST /api/trend-candidates/import` accepts `{ rows: [...] }` and returns `{ count, rows }`.

- [ ] **Step 3: Implement supply verification API**

`POST /api/trend-candidates/[id]/verify-supply` accepts:

```json
{
  "url": "https://detail.1688.com/offer/123.html",
  "title": "1688 桌面理线收纳盒",
  "price": 12,
  "moq": 2,
  "supplierName": "义乌某某工厂"
}
```

Expected behavior:

- If title and price exist, status is `matched`.
- If either is missing, status is `needs_manual_review`.

- [ ] **Step 4: Implement scoring API**

`POST /api/trend-candidates/[id]/score` scores one candidate and returns the updated candidate.

- [ ] **Step 5: Implement promote API**

`POST /api/trend-candidates/[id]/promote-to-product` creates a product-like payload through the existing products route behavior or shared helper.

Expected:

- Verified candidate becomes `promoted`.
- Unverified candidate returns error.

- [ ] **Step 6: Run API smoke tests**

Run:

```powershell
npm run dev --workspace @ecommerce/admin-panel
```

Then in another shell:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/trend-candidates
```

Expected: response has `success: true` and non-empty `data.rows`.

---

### Task 3: Candidate Pool UI

**Files:**
- Create: `apps/admin-panel/src/app/trend-candidates/page.tsx`
- Modify: `apps/admin-panel/src/components/sidebar.tsx`

- [ ] **Step 1: Add sidebar nav item**

Add:

```ts
{ href: "/trend-candidates", label: "趋势候选池", icon: Search }
```

Import `Search` from `lucide-react`.

- [ ] **Step 2: Build page**

Page requirements:

- Header: “趋势候选池”
- Button/form for manual candidate creation.
- Table columns: candidate, platform, heat, growth, supply status, score, action.
- Row actions: “验证供货”, “评分”, “加入产品池”.

- [ ] **Step 3: Browser verify**

Run dev server, open `http://localhost:3000/trend-candidates`, confirm:

- Seed rows render.
- Manual candidate can be added.
- Supply verification with missing price shows “需人工复核”.
- Matched supply can be scored.

---

### Task 4: Hot Radar Uses Scored Candidates

**Files:**
- Modify: `apps/admin-panel/src/app/api/hot-radar/rankings/route.ts`
- Modify: `apps/admin-panel/src/app/hot-radar/page.tsx`

- [ ] **Step 1: API returns scored candidates**

Change rankings route to read from `listCandidates()` and return candidates that have `score`.

Response:

```json
{
  "rows": [
    {
      "id": "candidate-id",
      "rank": 1,
      "name": "桌面理线收纳盒",
      "platform": "xiaohongshu",
      "overall_score": 82,
      "confidence": "medium",
      "supplyStatus": "matched",
      "recommendedAction": "test_listing"
    }
  ]
}
```

- [ ] **Step 2: Update page copy and table**

Replace 1688 keyword-monitor copy with:

- “全网趋势、供货验证、利润风险综合评分”
- columns for trend source, supply status, score, recommended action.

- [ ] **Step 3: Verify**

Run `npm run lint --workspace @ecommerce/admin-panel` and browser-open `/hot-radar`.

Expected: no TypeScript errors and page shows scored candidates.

---

### Task 5: Final Verification

**Files:**
- No new implementation files.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run TypeScript check**

Run: `npm run lint --workspace @ecommerce/admin-panel`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build --workspace @ecommerce/admin-panel`

Expected: compiled successfully. Any existing Next lockfile patch warning must be reported separately.

- [ ] **Step 4: Browser workflow verification**

Verify:

1. Open `/trend-candidates`.
2. Add candidate.
3. Verify supply with valid title and price.
4. Score candidate.
5. Promote candidate into product pool.
6. Open `/products` and confirm product appears.
7. Open `/hot-radar` and confirm scored candidate appears.

---

## Self-Review

- Spec coverage: The plan covers trend candidate pool, 1688 supply verification as validation, hot radar scoring, manual promotion to product pool, and UI navigation. It does not implement true scheduled collection or third-party platform crawling in this slice; that is intentionally deferred per the first-stage plan.
- Placeholder scan: No TODO/TBD placeholders are used.
- Type consistency: Candidate, supply, score, and product-promotion concepts are named consistently across tasks.
