import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"
import { apiResponse, apiError } from "@/lib/data/mock-data"

let _nextId = 100
const _store: Record<string, any[]> = {}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id") || ""

  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data, error } = await withSupabaseTimeout(supabase.from("data_snapshots").select("*").eq("product_id", productId).order("snapshot_date"))
      if (!error && data?.length) return apiResponse(data)
    }
  } catch {}

  if (_store[productId] && _store[productId].length > 0) return apiResponse(_store[productId])
  return apiResponse([])
}

export async function POST(req: Request) {
  const body = await req.json()
  const pid = body.product_id || ""

  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data, error } = await withSupabaseTimeout(supabase.from("data_snapshots").upsert(body, { onConflict: "product_id,snapshot_date" }).select().single())
      if (!error && data) return apiResponse(data, 201)
    }
  } catch {}

  if (!_store[pid]) _store[pid] = []
  const existing = _store[pid].findIndex((s: any) => s.snapshot_date === body.snapshot_date)
  const entry = { id: ++_nextId, ...body, created_at: new Date().toISOString() }
  if (existing >= 0) _store[pid][existing] = entry
  else _store[pid].push(entry)
  return apiResponse(entry, 201)
}
