import { apiError, apiResponse } from "@/lib/data/mock-data"
import { scoreCandidate } from "@/lib/trend-candidates-store"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    return apiResponse(await scoreCandidate(params.id))
  } catch (err: any) {
    return apiError(err.message || "趋势评分失败", 400)
  }
}
