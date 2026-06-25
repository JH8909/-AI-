import { apiError, apiResponse } from "@/lib/data/mock-data"
import { verifyCandidateSupply } from "@/lib/trend-candidates-store"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    return apiResponse(await verifyCandidateSupply(params.id, await req.json()))
  } catch (err: any) {
    return apiError(err.message || "供货验证失败", 400)
  }
}
