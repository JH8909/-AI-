import { getSupabaseClient } from "@/lib/supabase"
import { mockAnalyses, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const supabase = await getSupabaseClient()
  if (!supabase) return apiResponse(mockAnalyses)

  const { data, error } = await supabase.from("competitor_analyses").select("*").order("created_at", { ascending: false })
  if (error) return apiError(error.message)
  return apiResponse(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiResponse({ id: "generated", ...body, created_at: new Date().toISOString(), analysis: "Mock: 竞品分析结果", model_used: "mock" }, 201)
  }
  const { data, error } = await supabase.from("competitor_analyses").insert(body).select().single()
  if (error) return apiError(error.message)
  return apiResponse(data, 201)
}
