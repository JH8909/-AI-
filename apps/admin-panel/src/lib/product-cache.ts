import { promises as fs } from "fs"
import { dataPath } from "@/lib/data-dir"
import { randomUUID } from "crypto"

const CACHE_FILE = ".products-cache.json"

export function normalizeProductName(value: string) {
  return value.replace(/[\s\p{P}]/gu, "").toLowerCase()
}

export function mergeProducts(primary: any[], secondary: any[]) {
  const seen = new Set<string>()
  const merged = []
  for (const item of [...primary, ...secondary]) {
    const key = item.id || normalizeProductName(item.name || "")
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export async function readCachedProducts(): Promise<any[]> {
  try {
    const data = JSON.parse(await fs.readFile(await dataPath(CACHE_FILE), "utf-8"))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function writeCachedProducts(items: any[]) {
  try {
    await fs.writeFile(await dataPath(CACHE_FILE), JSON.stringify(items, null, 2), "utf-8")
  } catch {
    // Local cache is a best-effort fallback; callers should still be able to proceed.
  }
}

export async function createCachedProduct(body: any) {
  const product = {
    ...body,
    id: body.id || randomUUID(),
    risk_level: body.risk_level || "safe",
    status: body.status || "draft",
    images: Array.isArray(body.images) ? body.images : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    source_url: body.source_url || null,
    price: typeof body.price === "number" ? body.price : null,
    cost: typeof body.cost === "number" ? body.cost : null,
    created_at: new Date().toISOString(),
  }
  const cached = await readCachedProducts()
  cached.unshift(product)
  await writeCachedProducts(mergeProducts(cached, []))
  return product
}
