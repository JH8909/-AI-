import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"
import { mockAnalyses, apiResponse } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const supabase = await getSupabaseClient()
  if (!supabase) return apiResponse(mockAnalyses)

  try {
    const { data, error } = await withSupabaseTimeout(supabase.from("competitor_analyses").select("*").order("created_at", { ascending: false }))
    if (!error && data) return apiResponse(data)
  } catch {}
  return apiResponse(mockAnalyses)
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiResponse({ id: "generated", ...body, created_at: new Date().toISOString(), analysis: "Mock: 竞品分析结果", model_used: "mock" }, 201)
  }
  try {
    const { data, error } = await withSupabaseTimeout(supabase.from("competitor_analyses").insert(body).select().single())
    if (!error && data) return apiResponse(data, 201)
  } catch {}
  return apiResponse({ id: "generated", ...body, created_at: new Date().toISOString(), analysis: "Mock: 竞品分析结果", model_used: "mock" }, 201)
}
