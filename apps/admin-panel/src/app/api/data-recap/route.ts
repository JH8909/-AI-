import { mockSnapshots, recapSummary, apiResponse } from "@/lib/data/mock-data"
import { queryRows } from "@/lib/postgres"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id") || "1"

  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const data = await queryRows(
      `SELECT * FROM data_snapshots
       WHERE product_id = $1 AND snapshot_date >= $2
       ORDER BY snapshot_date`,
      [productId, sevenDaysAgo.toISOString().split("T")[0]],
    )
    if (data.length) {
      return apiResponse({ product_id: productId, period: "7 days", snapshots: data, aiSummary: recapSummary })
    }
  } catch {}

  return apiResponse({
    product_id: productId,
    period: "2026-06-16 ~ 2026-06-23",
    snapshots: mockSnapshots,
    aiSummary: recapSummary,
  })
}
