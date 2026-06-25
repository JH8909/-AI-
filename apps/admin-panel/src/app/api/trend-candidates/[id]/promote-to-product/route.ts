import { apiError, apiResponse } from "@/lib/data/mock-data"
import { createCachedProduct, mergeProducts, readCachedProducts, writeCachedProducts } from "@/lib/product-cache"
import { normalizeDbProduct, queryOne } from "@/lib/postgres"
import { buildPromotionProduct, listCandidates, promoteCandidate } from "@/lib/trend-candidates-store"

async function createProduct(payload: any) {
  try {
    const existing = await queryOne(
      "SELECT * FROM products WHERE name = $1 OR (source_url IS NOT NULL AND source_url = $2) ORDER BY created_at DESC LIMIT 1",
      [payload.name || "", payload.source_url || null],
    )
    if (existing) return normalizeDbProduct(existing)

    const data = await queryOne(
      `INSERT INTO products (
        name, description, category, source, source_url, price, cost, images, specs, tags, status, risk_level
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        payload.name || "",
        payload.description || "",
        payload.category || "other",
        payload.source || "hot_radar",
        payload.source_url || null,
        payload.price ?? null,
        payload.cost ?? null,
        Array.isArray(payload.images) ? payload.images : [],
        payload.specs || {},
        Array.isArray(payload.tags) ? payload.tags : [],
        payload.status || "draft",
        payload.risk_level || "safe",
      ],
    )
    if (data) {
      const product = normalizeDbProduct(data)
      const cached = await readCachedProducts()
      cached.unshift(product)
      await writeCachedProducts(mergeProducts(cached, []))
      return product
    }
  } catch {}
  return createCachedProduct(payload)
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const candidate = (await listCandidates()).find((item) => item.id === params.id)
    if (!candidate) return apiError("候选商品不存在", 404)
    const product = await createProduct(buildPromotionProduct(candidate))
    const updatedCandidate = await promoteCandidate(params.id)
    return apiResponse({ candidate: updatedCandidate, product }, 201)
  } catch (err: any) {
    return apiError(err.message || "加入产品池失败", 400)
  }
}
