import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSupabaseClient } from "@/lib/supabase"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await getSupabaseClient()
    if (!supabase) return apiError("Supabase 未配置", 503)
    const body = await req.json()
    const { data, error } = await supabase.from("products").upsert(body).eq("id", params.id).select().single()
    if (error) {
      if (String(error.message || error).includes("Could not find the table")) {
        return apiResponse({ mock: true, error: "Supabase 表未创建，请先执行迁移SQL" })
      }
      return apiError(error.message)
    }
    return apiResponse(data)
  } catch (err: any) {
    return apiResponse({ mock: true, note: "Supabase 未配置" })
  }
}
