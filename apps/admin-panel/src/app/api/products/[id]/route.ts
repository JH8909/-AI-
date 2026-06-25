import { apiResponse } from "@/lib/data/mock-data"
import { normalizeDbProduct, queryOne } from "@/lib/postgres"

let _store: Record<string, any> = {}

const PRODUCT_FIELDS = new Set([
  "name",
  "description",
  "category",
  "source",
  "source_url",
  "price",
  "cost",
  "images",
  "specs",
  "tags",
  "status",
  "risk_level",
])

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await req.json()

  try {
    const entries = Object.entries(body).filter(([key]) => PRODUCT_FIELDS.has(key))
    if (entries.length) {
      const assignments = entries.map(([key], index) => `${key} = $${index + 2}`)
      const values = entries.map(([, value]) => value as any)
      const product = await queryOne(
        `UPDATE products SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, ...values],
      )
      if (product) {
        if (body.status === "testing_candidate" && body._action === "enter_test_pool") {
          const draft = await queryOne(
            `INSERT INTO content_drafts (product_id, platform, content_type, title, body, hashtags, status)
             VALUES ($1, 'xiaohongshu', 'product_post', '', '', ARRAY[]::text[], 'pending')
             RETURNING *`,
            [id],
          )
          return apiResponse({ product: normalizeDbProduct(product), draft, message: "产品已加入测试池，内容草稿已创建" }, 200)
        }
        return apiResponse(normalizeDbProduct(product))
      }
    }
  } catch {}

  _store[id] = { ...(_store[id] || {}), ...body, id }

  if (body.status === "testing_candidate" && body._action === "enter_test_pool") {
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
