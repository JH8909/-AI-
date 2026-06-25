import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSupabaseClient } from "@/lib/supabase"

let _store: Record<string, any> = {}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await req.json()

  // Try Supabase first
  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data, error } = await supabase.from("products").update(body).eq("id", id).select().single()
      if (!error && data) return apiResponse(data)
    }
  } catch {}

  // Mock fallback: update in-memory store
  _store[id] = { ...(_store[id] || {}), ...body, id }

  // If status changed to testing_candidate and called "加入测试池", create a placeholder draft
  if (body.status === "testing_candidate" && body._action === "enter_test_pool") {
    // Create a mock content draft
    const productName = body.name || body._productName || "产品"
    const draft = {
      id: String(Date.now()),
      product_id: id,
      productName,
      platform: "xiaohongshu",
      title: "",
      body: "",
      hashtags: [],
      priceSuggestion: null,
      status: "pending",
      image_prompt: "",
      created_at: new Date().toISOString(),
    }
    return apiResponse({ product: _store[id], draft, message: "产品已加入测试池，内容草稿已创建" }, 200)
  }

  return apiResponse(_store[id])
}
