import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"
import { mockDrafts, apiResponse, apiError } from "@/lib/data/mock-data"
import { promises as fs } from "fs"
import path from "path"

const CACHE_FILE = path.join(process.cwd(), ".review-cache.json")
const _drafts: any[] = []

function createId() {
  return crypto.randomUUID()
}

async function readReviewCache(): Promise<any[]> {
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, "utf-8"))
  } catch {
    return []
  }
}

async function writeReviewCache(items: any[]) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(items, null, 2), "utf-8")
  } catch {}
}

async function cacheReviewItem(item: any) {
  const cached = await readReviewCache()
  cached.unshift(item)
  await writeReviewCache(cached)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const platform = url.searchParams.get("platform") || "all"

  const supabase = await getSupabaseClient()
  if (!supabase) {
    let data = [..._drafts, ...mockDrafts]
    if (platform !== "all") data = data.filter(d => d.platform === platform)
    return apiResponse(data)
  }

  try {
    let query = supabase.from("content_drafts").select("*, products(name)")
    if (platform !== "all") query = query.eq("platform", platform)
    query = query.order("created_at", { ascending: false })

    const { data, error } = await withSupabaseTimeout(query)
    if (!error && data) {
      return apiResponse((data || []).map((item: any) => ({
        ...item,
        productName: item.products?.name || item.productName || item.product_id,
        priceSuggestion: item.price_suggestion,
      })))
    }
  } catch {}
  let data = [..._drafts, ...mockDrafts]
  if (platform !== "all") data = data.filter(d => d.platform === platform)
  return apiResponse(data)
}

const BLOCKED = ["仿牌","原单","复刻","高仿","减肥","瘦身","医疗","治疗","保健品","三无"]
const WARN = ["nike","adidas","lv","gucci","chanel"]

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") return value.split(/[,\s#，、]+/).map((item) => item.trim()).filter(Boolean)
  return []
}

function checkRisk(title: string, body: string, tags: unknown): "safe" | "warning" | "blocked" {
  const text = (title + " " + body + " " + normalizeTextList(tags).join(" ")).toLowerCase()
  if (BLOCKED.some(k => text.includes(k))) return "blocked"
  if (WARN.some(k => text.includes(k))) return "warning"
  return "safe"
}

export async function POST(req: Request) {
  const body = await req.json()
  if (body.id && body.status === "scheduled") {
    try {
      const supabase = await getSupabaseClient()
      if (supabase) {
        const { data, error } = await withSupabaseTimeout(supabase.from("content_drafts")
          .update({ status: "scheduled", scheduled_at: body.scheduled_at || null })
          .eq("id", body.id).select().single())
        if (!error && data) return apiResponse(data)
      }
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
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data, error } = await withSupabaseTimeout(supabase.from("content_drafts").insert({
        product_id: body.product_id,
        platform: body.platform,
        content_type: body.content_type || "product_post",
        title: body.title || "",
        body: body.body || "",
        hashtags,
        price_suggestion: body.price_suggestion ?? null,
        image_prompt: imagePrompt || null,
        status,
      }).select().single())
      if (!error && data) {
        const reviewItem = {
          id: createId(),
          content_draft_id: data.id,
          contentDraftId: data.id,
          productName: body.productName || body.product_id,
          platform: body.platform,
          title: body.title || "",
          body: (body.body || "").slice(0, 100),
          status: "pending",
          riskNote: isHighRisk ? "高风险内容" : "",
          is_high_risk: isHighRisk,
          checklist: [],
          created_at: data.created_at || new Date().toISOString(),
        }
        const { error: reviewError } = await withSupabaseTimeout(supabase.from("review_queue").insert({
          content_draft_id: data.id,
          status: "pending",
          is_high_risk: isHighRisk,
          checklist: [],
        }))
        if (reviewError) await cacheReviewItem(reviewItem)
        return apiResponse({ ...data, productName: body.productName || body.product_id }, 201)
      }
    }
  } catch {}

  // Mock fallback
  const draft = {
    id: String(Date.now()), ...body, hashtags, image_prompt: imagePrompt, status, risk_level: riskLevel,
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
