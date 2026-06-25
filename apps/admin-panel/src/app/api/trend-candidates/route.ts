import { apiError, apiResponse } from "@/lib/data/mock-data"
import { createCandidate, listCandidates } from "@/lib/trend-candidates-store"

export async function GET() {
  return apiResponse({ rows: await listCandidates() })
}

export async function POST(req: Request) {
  try {
    return apiResponse(await createCandidate(await req.json()), 201)
  } catch (err: any) {
    return apiError(err.message || "创建趋势候选失败", 400)
  }
}
