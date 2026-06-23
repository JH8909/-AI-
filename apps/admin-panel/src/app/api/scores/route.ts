import { getSupabaseClient } from "@/lib/supabase"
import { mockScores, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id")

  const supabase = await getSupabaseClient()
  if (!supabase) {
    let data = [...mockScores]
    if (productId) data = data.filter(s => s.product_id === productId)
    return apiResponse(data)
  }

  let query = supabase.from("product_scores").select("*, products(name)")
  if (productId) query = query.eq("product_id", productId)
  query = query.order("created_at", { ascending: false })

  const { data, error } = await query
  if (error) return apiError(error.message)
  return apiResponse((data || []).map((item: any) => ({
    ...item,
    productName: item.products?.name || item.productName || item.product_id,
  })))
}
