import { apiResponse, apiError } from "@/lib/data/mock-data"
import { dataPath } from "@/lib/data-dir"
import { queryOne, queryRows } from "@/lib/postgres"
import { promises as fs } from "fs"
import { createPendingPublishRecord } from "@/lib/publish-record-store"
import { updateCachedContentDraftStatus } from "@/lib/content-drafts-cache"

const CACHE_FILE = ".review-cache.json"

async function readCache(): Promise<any[]> {
  try {
    const data = await fs.readFile(await dataPath(CACHE_FILE), "utf-8")
    return JSON.parse(data)
  } catch { return [] }
}

async function writeCache(items: any[]) {
  try { await fs.writeFile(await dataPath(CACHE_FILE), JSON.stringify(items, null, 2), "utf-8") } catch {}
}

function mapReviewItem(item: any) {
  return {
    id: item.id,
    contentDraftId: item.content_draft_id,
    content_draft_id: item.content_draft_id,
    product_id: item.product_id,
    productName: item.product_name || item.product_id || "?",
    platform: item.platform || "",
    title: item.title || "",
    body: (item.body || "").slice(0, 100),
    status: item.status,
    riskNote: item.is_high_risk ? "高风险内容" : "",
    is_high_risk: item.is_high_risk || false,
    checklist: item.checklist || [],
    created_at: item.created_at,
  }
}

async function findReviewContext(id: string) {
  try {
    const row = await queryOne(
      `SELECT rq.*, d.product_id, d.platform, d.title, d.body, p.name AS product_name
       FROM review_queue rq
       LEFT JOIN content_drafts d ON d.id = rq.content_draft_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE rq.id = $1 OR rq.content_draft_id = $1
       LIMIT 1`,
      [id],
    )
    if (row) return mapReviewItem(row)
  } catch {}

  const cached = await readCache()
  return cached.find((r: any) => r.id === id || r.content_draft_id === id || r.contentDraftId === id) || null
}

export async function GET() {
  try {
    const rows = await queryRows(
      `SELECT rq.*, d.product_id, d.platform, d.title, d.body, p.name AS product_name
       FROM review_queue rq
       LEFT JOIN content_drafts d ON d.id = rq.content_draft_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE rq.status = 'pending'
       ORDER BY rq.created_at DESC`,
    )
    return apiResponse(rows.map(mapReviewItem))
  } catch {}

  const cached = await readCache()
  return apiResponse(cached.filter((r: any) => r.status === "pending"))
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, status, comment, checklist } = body
  const reviewContext = await findReviewContext(id)

  try {
    const data = await queryOne(
      `UPDATE review_queue
       SET status = $2, comment = $3, reviewed_at = NOW(), checklist = $4
       WHERE id = $1 OR content_draft_id = $1
       RETURNING *`,
      [id, status, comment || "", checklist || []],
    )
    if (data) {
      if (status === "approved") {
        await queryOne(
          "UPDATE content_drafts SET status = 'approved', updated_at = NOW() WHERE id = $1",
          [data.content_draft_id],
        ).catch(() => null)
        const publishRecord = await createPendingPublishRecord(reviewContext || { ...data, content_draft_id: data.content_draft_id })
        return apiResponse({ ...data, publishRecord })
      }
      return apiResponse(data)
    }
  } catch {}

  const cached = await readCache()
  const idx = cached.findIndex((r: any) => r.id === id || r.content_draft_id === id || r.contentDraftId === id)
  if (idx >= 0) {
    cached[idx].status = status
    cached[idx].comment = comment || ""
    cached[idx].reviewed_at = new Date().toISOString()
    await writeCache(cached)
    if (status === "approved") {
      await updateCachedContentDraftStatus(cached[idx].content_draft_id || cached[idx].contentDraftId, "approved")
      const publishRecord = await createPendingPublishRecord(cached[idx])
      return apiResponse({ ...cached[idx], publishRecord })
    }
    return apiResponse(cached[idx])
  }
  return apiError("审核记录未找到", 404)
}
