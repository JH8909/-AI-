import { apiError, apiResponse } from "@/lib/data/mock-data"
import { runAutomationPipeline } from "@/lib/automation-pipeline"

function authorized(req: Request) {
  const token = process.env.AUTOMATION_TOKEN || process.env.RADAR_INTERNAL_TOKEN || ""
  if (!token) return true
  return req.headers.get("x-automation-token") === token || new URL(req.url).searchParams.get("token") === token
}

export async function POST(req: Request) {
  if (!authorized(req)) return apiError("Unauthorized", 401)
  try {
    const body = await req.json().catch(() => ({}))
    const result = await runAutomationPipeline({
      promoteThreshold: body.promoteThreshold,
      maxPromotions: body.maxPromotions,
      seedOnly: Boolean(body.seedOnly),
    })
    return apiResponse(result, 201)
  } catch (err: any) {
    return apiError(err.message || "Automation run failed", 500)
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return apiError("Unauthorized", 401)
  try {
    const result = await runAutomationPipeline({ seedOnly: new URL(req.url).searchParams.get("seedOnly") === "1" })
    return apiResponse(result, 201)
  } catch (err: any) {
    return apiError(err.message || "Automation run failed", 500)
  }
}
