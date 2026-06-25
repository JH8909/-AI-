import { mockDrafts, apiResponse } from "@/lib/data/mock-data"
import { dataPath } from "@/lib/data-dir"
import { queryOne, queryRows } from "@/lib/postgres"
import { promises as fs } from "fs"
import { normalizePriceSuggestion } from "@/lib/content-drafts-utils"

const CACHE_FILE = ".review-cache.json"
const _drafts: any[] = []

function createId() {
  return crypto.randomUUID()
}

async function readReviewCache(): Promise<any[]> {
  try {
    return JSON.parse(await fs.readFile(await dataPath(CACHE_FILE), "utf-8"))
  } catch {
    return []
  }
}

async function writeReviewCache(items: any[]) {
  try {
    await fs.writeFile(await dataPath(CACHE_FILE), JSON.stringify(items, null, 2), "utf-8")
  } catch {}
}

async function cacheReviewItem(item: any) {
  const cached = await readReviewCache()
  cached.unshift(item)
  await writeReviewCache(cached)
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") return value.split(/[,\s#，、]+/).map((item) => item.trim()).filter(Boolean)
  return []
}

const BLOCKED = ["仿牌", "原单", "复刻", "高仿", "减肥", "瘦身", "医疗", "治疗", "保健品", "三无"]
const WARN = ["nike", "adidas", "lv", "gucci", "chanel"]

function checkRisk(title: string, body: string, tags: unknown): "safe" | "warning" | "blocked" {
  const text = (title + " " + body + " " + normalizeTextList(tags).join(" ")).toLowerCase()
  if (BLOCKED.some((keyword) => text.includes(keyword))) return "blocked"
  if (WARN.some((keyword) => text.includes(keyword))) return "warning"
  return "safe"
}

function mapDraft(item: any) {
  return {
    ...item,
    productName: item.product_name || item.productName || item.product_id,
    priceSuggestion: normalizePriceSuggestion(item.price_suggestion),
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const platform = url.searchParams.get("platform") || "all"

  try {
    const params: any[] = []
    const where: string[] = []
    if (platform !== "all") {
      params.push(platform)
      where.push(`d.platform = $${params.length}`)
    }
    const rows = await queryRows(
      `SELECT d.*, p.name AS product_name
       FROM content_drafts d
       LEFT JOIN products p ON p.id = d.product_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY d.created_at DESC`,
      params,
    )
    return apiResponse(rows.map(mapDraft))
  } catch {}

  let data = [..._drafts, ...mockDrafts]
  if (platform !== "all") data = data.filter((d) => d.platform === platform)
  return apiResponse(data)
}

export async function POST(req: Request) {
  const body = await req.json()

  if (body.id && body.status === "scheduled") {
    try {
      const data = await queryOne(
        `UPDATE content_drafts
         SET status = 'scheduled', scheduled_at = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [body.id, body.scheduled_at || null],
      )
      if (data) return apiResponse(data)
    } catch {}

    const draft = _drafts.find((item) => item.id === body.id)
    if (draft) {
      draft.status = "scheduled"
      draft.scheduled_at = body.scheduled_at || null
      return apiResponse(draft)
    }
    return apiResponse({ id: body.id, status: "scheduled", scheduled_at: body.scheduled_at || null })
  }

  const hashtags = normalizeTextList(body.hashtags)
  const riskLevel = checkRisk(body.title || "", body.body || "", hashtags)
  const status = riskLevel === "blocked" ? "rejected" : (body.status || "pending")
  const isHighRisk = riskLevel !== "safe" || Boolean(body.is_high_risk)
  const imagePrompt = typeof body.image_prompt === "object"
    ? [body.image_prompt.cn, body.image_prompt.en].filter(Boolean).join("\n")
    : body.image_prompt

  try {
    const draft = await queryOne(
      `INSERT INTO content_drafts (
        product_id, platform, content_type, title, body, hashtags, price_suggestion, image_prompt, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        body.product_id,
        body.platform,
        body.content_type || "product_post",
        body.title || "",
        body.body || "",
        hashtags,
        body.price_suggestion ?? null,
        imagePrompt || null,
        status,
      ],
    )
    if (draft) {
      const review = await queryOne(
        `INSERT INTO review_queue (content_draft_id, status, is_high_risk, checklist)
         VALUES ($1, 'pending', $2, $3)
         RETURNING *`,
        [draft.id, isHighRisk, []],
      )
      if (!review) {
        await cacheReviewItem({
          id: createId(),
          content_draft_id: draft.id,
          contentDraftId: draft.id,
          productName: body.productName || body.product_id,
          platform: body.platform,
          title: body.title || "",
          body: (body.body || "").slice(0, 100),
          status: "pending",
          riskNote: isHighRisk ? "高风险内容" : "",
          is_high_risk: isHighRisk,
          checklist: [],
          created_at: draft.created_at || new Date().toISOString(),
        })
      }
      return apiResponse({ ...draft, productName: body.productName || body.product_id }, 201)
    }
  } catch {}

  const draft = {
    id: String(Date.now()),
    ...body,
    hashtags,
    image_prompt: imagePrompt,
    status,
    risk_level: riskLevel,
    review_comment: riskLevel === "blocked" ? "自动拦截：含违禁词" : null,
    created_at: new Date().toISOString(),
  }
  _drafts.unshift(draft)
  await cacheReviewItem({
    id: createId(),
    content_draft_id: draft.id,
    contentDraftId: draft.id,
    productName: body.productName || body.product_id,
    platform: body.platform,
    title: body.title || "",
    body: (body.body || "").slice(0, 100),
    status: "pending",
    riskNote: isHighRisk ? "高风险内容" : "",
    is_high_risk: isHighRisk,
    checklist: [],
    created_at: draft.created_at,
  })
  return apiResponse(draft, 201)
}
