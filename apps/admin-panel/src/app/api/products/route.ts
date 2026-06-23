import { getSupabaseClient } from "@/lib/supabase"
import { mockProducts, apiResponse, apiError } from "@/lib/data/mock-data"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const search = url.searchParams.get("search") || ""
  const category = url.searchParams.get("category") || "all"
  const status = url.searchParams.get("status") || "all"

  const supabase = await getSupabaseClient()
  if (!supabase) {
    let data = [...mockProducts]
    if (search) data = data.filter(p => p.name.includes(search))
    if (category !== "all") data = data.filter(p => p.category === category)
    if (status !== "all") data = data.filter(p => p.status === status)
    return apiResponse(data)
  }

  let query = supabase.from("products").select("*")
  if (search) query = query.ilike("name", `%${search}%`)
  if (category !== "all") query = query.eq("category", category)
  if (status !== "all") query = query.eq("status", status)
  query = query.order("created_at", { ascending: false })

  const { data, error } = await query
  if (error) return apiError(error.message)
  return apiResponse(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiResponse({ ...body, id: String(Date.now()), created_at: new Date().toISOString() }, 201)
  }
  const { data, error } = await supabase.from("products").insert(body).select().single()
  if (error) return apiError(error.message)
  return apiResponse(data, 201)
}
