import { mockScores, apiResponse } from "@/lib/data/mock-data"
import { queryRows } from "@/lib/postgres"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id")

  try {
    const params: any[] = []
    const where: string[] = []
    if (productId) {
      params.push(productId)
      where.push(`s.product_id = $${params.length}`)
    }
    const rows = await queryRows(
      `SELECT s.*, p.name AS product_name
       FROM product_scores s
       LEFT JOIN products p ON p.id = s.product_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY s.created_at DESC`,
      params,
    )
    return apiResponse(rows.map((item: any) => ({
      ...item,
      overall_score: item.overall_score == null ? null : Number(item.overall_score),
      productName: item.product_name || item.productName || item.product_id,
    })))
  } catch {}

  let data = [...mockScores]
  if (productId) data = data.filter((s) => s.product_id === productId)
  return apiResponse(data)
}
