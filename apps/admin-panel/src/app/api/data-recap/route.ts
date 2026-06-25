import { mockSnapshots, recapSummary, apiResponse } from "@/lib/data/mock-data"
import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id") || "1"

  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { data, error } = await withSupabaseTimeout(supabase.from("data_snapshots")
        .select("*").eq("product_id", productId)
        .gte("snapshot_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("snapshot_date"))
      if (!error && data?.length) {
        return apiResponse({ product_id: productId, period: "7 days", snapshots: data, aiSummary: recapSummary })
      }
    }
  } catch {}

  return apiResponse({
    product_id: productId, period: "2026-06-16 ~ 2026-06-23",
    snapshots: mockSnapshots, aiSummary: recapSummary
  })
}
