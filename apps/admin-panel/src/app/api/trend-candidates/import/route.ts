import { apiError, apiResponse } from "@/lib/data/mock-data"
import { bulkImportCandidates } from "@/lib/trend-candidates-store"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rows = Array.isArray(body.rows) ? body.rows : []
    const created = await bulkImportCandidates(rows)
    return apiResponse({ count: created.length, rows: created }, 201)
  } catch (err: any) {
    return apiError(err.message || "导入趋势候选失败", 400)
  }
}
