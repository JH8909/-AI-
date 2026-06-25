import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSupabaseClient } from "@/lib/supabase"
import { boundedStringList, readJson } from "../api-utils"

export async function GET() {
  try {
    const supabase = await getSupabaseClient()
    if (!supabase) return apiError("Supabase 未配置", 503)
    const { data, error } = await supabase.from("monitor_keywords").select("*").order("kind", { ascending: false }).order("created_at", { ascending: true })
    if (error) {
      if (String(error.message || error).includes("Could not find the table")) {
        return apiResponse({ mock: true, error: "Supabase 表未创建，请先执行迁移SQL" })
      }
      return apiError(error.message)
    }
    return apiResponse(data || [])
  } catch (err: any) {
    return apiResponse({ keywords: [], mock: true, note: "Supabase 表未创建或未配置" })
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req)
    const keywords = boundedStringList(body.keywords || body.seeds, 10)
    if (!keywords.length) return apiError("请至少提供 1 个监控关键词", 400)
    const supabase = await getSupabaseClient()
    if (!supabase) return apiError("Supabase 未配置", 503)
    const { error: de } = await supabase.from("monitor_keywords").update({ enabled: false }).eq("kind", "seed").not("keyword", "in", `(${keywords.map(k => '"' + k.replace(/"/g, '\"') + '"').join(",")})`)
    if (de) {
      if (String(de.message || de).includes("Could not find the table") || String(de.message || de).includes("schema cache")) {
        return apiResponse({ mock: true, error: "Supabase 表未创建，请先执行迁移SQL" })
      }
      return apiError(de.message)
    }
    const rows = keywords.map(k => ({ keyword: k, kind: "seed", enabled: true, consecutive_failures: 0 }))
    const { data, error } = await supabase.from("monitor_keywords").upsert(rows, { onConflict: "keyword" }).select("*")
    if (error) {
      if (String(error.message || error).includes("Could not find the table")) {
        return apiResponse({ mock: true, error: "Supabase 表未创建，请先执行迁移SQL" })
      }
      return apiError(error.message)
    }
    return apiResponse(data || [])
  } catch (err: any) {
    return apiResponse({ saved: false, mock: true, note: "Supabase 表未创建或未配置" })
  }
}
