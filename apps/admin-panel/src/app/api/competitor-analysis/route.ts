import { mockAnalyses, apiResponse } from "@/lib/data/mock-data"
import { queryOne, queryRows } from "@/lib/postgres"

export async function GET() {
  try {
    const data = await queryRows("SELECT * FROM competitor_analyses ORDER BY created_at DESC")
    return apiResponse(data)
  } catch {}
  return apiResponse(mockAnalyses)
}

export async function POST(req: Request) {
  const body = await req.json()
  try {
    const data = await queryOne(
      `INSERT INTO competitor_analyses (
        product_id, competitor_products, price_comparison, differentiation,
        content_strategy, overall_report, model_used, tokens_used
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        body.product_id,
        body.competitor_products || body.competitors || [],
        body.price_comparison || body.priceComparison || "",
        body.differentiation || "",
        body.content_strategy || body.contentStrategy || "",
        body.overall_report || body.overallReport || body.analysis || "",
        body.model_used || "",
        body.tokens_used || 0,
      ],
    )
    if (data) return apiResponse(data, 201)
  } catch {}
  return apiResponse({ id: "generated", ...body, created_at: new Date().toISOString(), analysis: "Mock: 竞品分析结果", model_used: "mock" }, 201)
}
