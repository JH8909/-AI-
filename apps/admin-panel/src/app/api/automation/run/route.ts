import { apiError, apiResponse } from "@/lib/data/mock-data"
import { runAutomationPipeline } from "@/lib/automation-pipeline"
import { finishAutomationRun, listAutomationRuns, startAutomationRun } from "@/lib/automation-run-store"

function authorized(req: Request) {
  const token = process.env.AUTOMATION_TOKEN || process.env.RADAR_INTERNAL_TOKEN || ""
  if (!token) return true
  return req.headers.get("x-automation-token") === token || new URL(req.url).searchParams.get("token") === token
}

function optionalNumber(value: string | null) {
  if (value == null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function POST(req: Request) {
  if (!authorized(req)) return apiError("Unauthorized", 401)
  let run: any = null
  try {
    const body = await req.json().catch(() => ({}))
    const options = {
      promoteThreshold: optionalNumber(body.promoteThreshold == null ? null : String(body.promoteThreshold)),
      maxPromotions: optionalNumber(body.maxPromotions == null ? null : String(body.maxPromotions)),
      seedOnly: Boolean(body.seedOnly),
      collectLimit: optionalNumber(body.collectLimit == null ? null : String(body.collectLimit)),
      includeCurated: body.includeCurated,
    }
    run = await startAutomationRun({ trigger: body.trigger || "manual", options })
    const result = await runAutomationPipeline(options)
    await finishAutomationRun(run?.id, "succeeded", result)
    return apiResponse({ runId: run?.id || null, ...result }, 201)
  } catch (err: any) {
    await finishAutomationRun(run?.id, "failed", {}, err.message || "Automation run failed")
    return apiError(err.message || "Automation run failed", 500)
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return apiError("Unauthorized", 401)
  let run: any = null
  try {
    const url = new URL(req.url)
    if (url.searchParams.get("history") === "1") {
      return apiResponse(await listAutomationRuns(Number(url.searchParams.get("limit") || 20)))
    }

    const options = {
      seedOnly: url.searchParams.get("seedOnly") === "1",
      promoteThreshold: optionalNumber(url.searchParams.get("promoteThreshold")),
      maxPromotions: optionalNumber(url.searchParams.get("maxPromotions")),
      collectLimit: optionalNumber(url.searchParams.get("collectLimit")),
      includeCurated: url.searchParams.has("includeCurated") ? url.searchParams.get("includeCurated") !== "0" : undefined,
    }
    run = await startAutomationRun({ trigger: url.searchParams.get("trigger") || "cron", options })
    const result = await runAutomationPipeline(options)
    await finishAutomationRun(run?.id, "succeeded", result)
    return apiResponse({ runId: run?.id || null, ...result }, 201)
  } catch (err: any) {
    await finishAutomationRun(run?.id, "failed", {}, err.message || "Automation run failed")
    return apiError(err.message || "Automation run failed", 500)
  }
}
