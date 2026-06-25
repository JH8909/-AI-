import { apiResponse } from "@/lib/data/mock-data"
import { normalizeDbProduct, queryOne } from "@/lib/postgres"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const product = await queryOne(
      `UPDATE products
       SET radar_state = COALESCE($2, radar_state),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [params.id, body.radar_state || body.state || null, body.status || null],
    )
    if (product) return apiResponse(normalizeDbProduct(product))
  } catch (err: any) {
    return apiResponse({ mock: true, note: err.message || "服务器数据库未配置或产品表未创建" })
  }
  return apiResponse({ mock: true, note: "产品未找到" })
}
