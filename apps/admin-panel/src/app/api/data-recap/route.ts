import { getSupabaseClient } from "@/lib/supabase"
import { mockSnapshots, recapSummary, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id") || "1"

  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiResponse({
      product_id: productId, period: "2026-06-16 ~ 2026-06-23",
      snapshots: mockSnapshots, aiSummary: recapSummary
    })
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase.from("data_snapshots")
    .select("*").eq("product_id", productId)
    .gte("snapshot_date", sevenDaysAgo.toISOString().split("T")[0])
    .order("snapshot_date")

  if (error) return apiError(error.message)
  return apiResponse({ product_id: productId, snapshots: data, aiSummary: recapSummary })
}
