import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"
import { mockScores, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id")

  const fallback = () => {
    let data = [...mockScores]
    if (productId) data = data.filter(s => s.product_id === productId)
    return apiResponse(data)
  }
  const supabase = await getSupabaseClient()
  if (!supabase) return fallback()

  try {
    let query = supabase.from("product_scores").select("*, products(name)")
    if (productId) query = query.eq("product_id", productId)
    query = query.order("created_at", { ascending: false })

    const { data, error } = await withSupabaseTimeout(query)
    if (!error && data) {
      return apiResponse((data || []).map((item: any) => ({
        ...item,
        productName: item.products?.name || item.productName || item.product_id,
      })))
    }
  } catch {}
  return fallback()
}
