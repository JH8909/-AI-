import { getSupabaseClient } from "@/lib/supabase"
import { mockReviewQueue, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET() {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiResponse(mockReviewQueue.filter(r => r.status === "pending"))
  }
  const { data, error } = await supabase.from("review_queue")
    .select("*, content_drafts(*, products(name))")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  if (error) return apiError(error.message)
  return apiResponse((data || []).map((item: any) => {
    const draft = item.content_drafts || {}
    return {
      ...item,
      contentDraftId: draft.id || item.content_draft_id,
      productName: draft.products?.name || draft.product_id || "产品",
      platform: draft.platform,
      title: draft.title,
      body: draft.body,
    }
  }))
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, status, comment } = body

  const supabase = await getSupabaseClient()
  if (!supabase) {
    const idx = mockReviewQueue.findIndex(r => r.id === id)
    if (idx === -1) return apiError("Not found", 404)
    mockReviewQueue.splice(idx, 1)
    return apiResponse({ id, status, comment, reviewed_at: new Date().toISOString() })
  }

  const { data, error } = await supabase.from("review_queue")
    .update({ status, comment, reviewed_at: new Date().toISOString() })
    .eq("id", id).select().single()
  if (error) return apiError(error.message)
  await supabase.from("content_drafts")
    .update({ status, review_comment: comment || null })
    .eq("id", data.content_draft_id)
  return apiResponse(data)
}
