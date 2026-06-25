import { dataPath } from "@/lib/data-dir"
import { promises as fs } from "fs"
import { randomUUID } from "crypto"

const DRAFTS_CACHE_FILE = ".content-drafts-cache.json"
const REVIEW_CACHE_FILE = ".review-cache.json"

async function readJsonArray(fileName: string): Promise<any[]> {
  try {
    const rows = JSON.parse(await fs.readFile(await dataPath(fileName), "utf-8"))
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

async function writeJsonArray(fileName: string, rows: any[]) {
  try {
    await fs.writeFile(await dataPath(fileName), JSON.stringify(rows, null, 2), "utf-8")
  } catch {}
}

export async function readCachedContentDrafts() {
  return readJsonArray(DRAFTS_CACHE_FILE)
}

export async function writeCachedContentDrafts(rows: any[]) {
  await writeJsonArray(DRAFTS_CACHE_FILE, rows)
}

export async function readCachedReviewItems() {
  return readJsonArray(REVIEW_CACHE_FILE)
}

export async function writeCachedReviewItems(rows: any[]) {
  await writeJsonArray(REVIEW_CACHE_FILE, rows)
}

export async function updateCachedContentDraftStatus(id: string, status: string) {
  const rows = await readCachedContentDrafts()
  const index = rows.findIndex((item) => item.id === id || item.content_draft_id === id || item.contentDraftId === id)
  if (index < 0) return null
  rows[index] = {
    ...rows[index],
    status,
    updated_at: new Date().toISOString(),
  }
  await writeCachedContentDrafts(rows)
  return rows[index]
}

export async function createCachedContentDraft(body: any) {
  const draft = {
    id: body.id || randomUUID(),
    product_id: body.product_id || body.productId || null,
    productName: body.productName || body.product_name || body.product_id || "",
    platform: body.platform || "xiaohongshu",
    content_type: body.content_type || "product_post",
    title: body.title || "",
    body: body.body || "",
    hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
    price_suggestion: body.price_suggestion ?? null,
    priceSuggestion: body.price_suggestion ?? body.priceSuggestion ?? null,
    image_prompt: body.image_prompt || null,
    status: body.status || "pending",
    risk_level: body.risk_level || "safe",
    review_comment: body.review_comment || null,
    created_at: body.created_at || new Date().toISOString(),
  }
  const rows = await readCachedContentDrafts()
  rows.unshift(draft)
  await writeCachedContentDrafts(rows.slice(0, 200))
  return draft
}

export async function cacheReviewItem(item: any) {
  const rows = await readCachedReviewItems()
  rows.unshift({
    id: item.id || randomUUID(),
    content_draft_id: item.content_draft_id || item.contentDraftId,
    contentDraftId: item.contentDraftId || item.content_draft_id,
    product_id: item.product_id || item.productId || null,
    productId: item.productId || item.product_id || null,
    productName: item.productName || item.product_name || item.product_id || "",
    platform: item.platform || "",
    title: item.title || "",
    body: String(item.body || "").slice(0, 100),
    status: item.status || "pending",
    riskNote: item.riskNote || "",
    is_high_risk: Boolean(item.is_high_risk),
    checklist: Array.isArray(item.checklist) ? item.checklist : [],
    created_at: item.created_at || new Date().toISOString(),
  })
  await writeCachedReviewItems(rows.slice(0, 200))
}
