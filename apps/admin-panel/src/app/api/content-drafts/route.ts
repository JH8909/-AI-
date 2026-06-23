import { getSupabaseClient } from "@/lib/supabase"
import { mockDrafts, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const platform = url.searchParams.get("platform") || "all"

  const supabase = await getSupabaseClient()
  if (!supabase) {
    let data = [...mockDrafts]
    if (platform !== "all") data = data.filter(d => d.platform === platform)
    return apiResponse(data)
  }

  let query = supabase.from("content_drafts").select("*, products(name)")
  if (platform !== "all") query = query.eq("platform", platform)
  query = query.order("created_at", { ascending: false })

  const { data, error } = await query
  if (error) return apiError(error.message)
  return apiResponse((data || []).map((item: any) => ({
    ...item,
    productName: item.products?.name || item.productName || item.product_id,
    priceSuggestion: item.price_suggestion,
  })))
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiResponse({ id: String(Date.now()), ...body, status: "pending", created_at: new Date().toISOString() }, 201)
  }
  const { data, error } = await supabase.from("content_drafts").insert(body).select().single()
  if (error) return apiError(error.message)
  return apiResponse(data, 201)
}
