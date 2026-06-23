import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSettings, updateSettings, initSettings } from "@/lib/settings-store"
import { publicSettings, settingsPatchFromBody } from "./settings-utils"

export async function GET() {
  await initSettings()
  return apiResponse(publicSettings(getSettings()))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const settings = await updateSettings(settingsPatchFromBody(body))
    return apiResponse({ message: "Saved. Settings are active immediately.", ...publicSettings(settings) })
  } catch (err: any) {
    return apiError(err.message || "Save failed")
  }
}
