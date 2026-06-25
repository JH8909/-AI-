import { mockProducts, apiResponse, apiError } from "@/lib/data/mock-data"
import { createCachedProduct, mergeProducts, normalizeProductName, readCachedProducts, writeCachedProducts } from "@/lib/product-cache"
import { normalizeDbProduct, queryOne, queryRows } from "@/lib/postgres"

const localProducts = [...mockProducts]

async function createLocalProduct(body: any) {
  const product = await createCachedProduct(body)
  localProducts.unshift(product)
  return product
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const search = url.searchParams.get("search") || ""
  const category = url.searchParams.get("category") || "all"
  const status = url.searchParams.get("status") || "all"

  const cachedProducts = await readCachedProducts()
  const fallback = () => {
    let data = mergeProducts(cachedProducts, localProducts)
    if (search) data = data.filter((p: any) => String(p.name || "").includes(search))
    if (category !== "all") data = data.filter((p: any) => p.category === category)
    if (status !== "all") data = data.filter((p: any) => p.status === status)
    return apiResponse(data)
  }

  try {
    const where: string[] = []
    const params: any[] = []
    if (search) {
      params.push(`%${search}%`)
      where.push(`name ILIKE $${params.length}`)
    }
    if (category !== "all") {
      params.push(category)
      where.push(`category = $${params.length}`)
    }
    if (status !== "all") {
      params.push(status)
      where.push(`status = $${params.length}`)
    }
    const rows = await queryRows(
      `SELECT * FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC`,
      params,
    )
    return apiResponse(mergeProducts(cachedProducts, rows.map(normalizeDbProduct)))
  } catch {
    return fallback()
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.source) body.source = "manual"

  if (body.name) {
    const newName = normalizeProductName(body.name)
    const cachedProducts = await readCachedProducts()
    const localDup = mergeProducts(cachedProducts, localProducts).find((p: any) => {
      const existingName = normalizeProductName(p.name || "")
      return existingName === newName || existingName.includes(newName) || newName.includes(existingName)
    })
    if (localDup) return apiError("重复产品: 已存在 '" + localDup.name + "'", 409)

    try {
      const existing = await queryRows<{ id: string; name: string }>(
        "SELECT id, name FROM products ORDER BY created_at DESC LIMIT 200",
      )
      const dup = existing.find((p) => {
        const existingName = normalizeProductName(p.name || "")
        return existingName === newName || existingName.includes(newName) || newName.includes(existingName)
      })
      if (dup) return apiError("重复产品: 已存在 '" + dup.name + "'", 409)
    } catch {}
  }

  try {
    const data = await queryOne(
      `INSERT INTO products (
        name, description, category, source, source_url, price, cost, images, specs, tags, status, risk_level
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        body.name || "",
        body.description || "",
        body.category || "other",
        body.source || "manual",
        body.source_url || null,
        body.price ?? null,
        body.cost ?? null,
        Array.isArray(body.images) ? body.images : [],
        body.specs || {},
        Array.isArray(body.tags) ? body.tags : [],
        body.status || "draft",
        body.risk_level || "safe",
      ],
    )
    if (data) {
      const product = normalizeDbProduct(data)
      const cached = await readCachedProducts()
      cached.unshift(product)
      await writeCachedProducts(mergeProducts(cached, []))
      return apiResponse(product, 201)
    }
  } catch {}

  return apiResponse(await createLocalProduct(body), 201)
}
