import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"
import { apiResponse, apiError } from "@/lib/data/mock-data"
import { promises as fs } from "fs"
import path from "path"

const CACHE_FILE = path.join(process.cwd(), ".review-cache.json")

async function readCache(): Promise<any[]> {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf-8")
    return JSON.parse(data)
  } catch { return [] }
}

async function writeCache(items: any[]) {
  try { await fs.writeFile(CACHE_FILE, JSON.stringify(items, null, 2), "utf-8") } catch {}
}

// Sync local cache to Supabase (merge pending items)
async function syncToSupabase(supabase: any) {
  const cached = await readCache()
  if (cached.length === 0) return
  const remaining = []
  for (const item of cached) {
    if (item.status === "pending") {
      try {
        const { error } = await withSupabaseTimeout<any>(supabase.from("review_queue").upsert({
          id: item.id, content_draft_id: item.content_draft_id,
          status: "pending", is_high_risk: item.is_high_risk || false,
          checklist: item.checklist || [],
        }, { onConflict: "id" }).maybeSingle())
        if (error) remaining.push(item)
      } catch {
        remaining.push(item)
      }
    } else {
      remaining.push(item)
    }
  }
  await writeCache(remaining)
}

export async function GET() {
  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      await syncToSupabase(supabase)
      const { data, error } = await withSupabaseTimeout(supabase
        .from("review_queue").select("*, content_drafts(*)")
        .eq("status", "pending").order("created_at", { ascending: false }))
      if (!error && data) {
        const mapped = data.map((item: any) => ({
          id: item.id, contentDraftId: item.content_draft_id,
          productName: item.content_drafts?.product_id || "?",
          platform: item.content_drafts?.platform || "",
          title: item.content_drafts?.title || "",
          body: (item.content_drafts?.body || "").slice(0, 100),
          status: item.status, riskNote: item.is_high_risk ? "高风险内容" : "",
          is_high_risk: item.is_high_risk || false,
          created_at: item.created_at,
        }))
        if (mapped.length > 0) return apiResponse(mapped)
      }
    }
  } catch {}

  // Fallback to local cache
  const cached = await readCache()
  return apiResponse(cached.filter((r: any) => r.status === "pending"))
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, status, comment, checklist } = body

  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data, error } = await withSupabaseTimeout(supabase.from("review_queue")
        .update({ status, comment, reviewed_at: new Date().toISOString(), checklist: checklist || [] })
        .eq("id", id).select().single())
      if (!error) {
        // Also update local cache if exists
        const cached = await readCache()
        const idx = cached.findIndex((r: any) => r.id === id || r.content_draft_id === id)
        if (idx >= 0) {
          cached[idx].status = status
          cached[idx].comment = comment || ""
          await writeCache(cached)
        }
        return apiResponse(data || { id, status, comment })
      }
    }
  } catch {}

  // Fallback to local cache
  const cached = await readCache()
  const idx = cached.findIndex((r: any) => r.id === id || r.content_draft_id === id)
  if (idx >= 0) {
    cached[idx].status = status
    cached[idx].comment = comment || ""
    cached[idx].reviewed_at = new Date().toISOString()
    await writeCache(cached)
    return apiResponse(cached[idx])
  }
  return apiError("审核记录未找到", 404)
}
