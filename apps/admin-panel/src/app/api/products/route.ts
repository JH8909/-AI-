import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase"
import { mockProducts, apiResponse, apiError } from "@/lib/data/mock-data"
import { createCachedProduct, mergeProducts, normalizeProductName, readCachedProducts, writeCachedProducts } from "@/lib/product-cache"

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

  const filterData = (items: any[]) => {
    let data = items
    if (search) data = data.filter(p => p.name.includes(search))
    if (category !== "all") data = data.filter(p => p.category === category)
    if (status !== "all") data = data.filter(p => p.status === status)
    return apiResponse(data)
  }

  const cachedProducts = await readCachedProducts()
  const fallback = () => filterData(mergeProducts(cachedProducts, localProducts))

  const supabase = await getSupabaseClient()
  if (!supabase) return fallback()

  try {
    let query = supabase.from("products").select("*")
    if (search) query = query.ilike("name", `%${search}%`)
    if (category !== "all") query = query.eq("category", category)
    if (status !== "all") query = query.eq("status", status)
    query = query.order("created_at", { ascending: false })

    const { data, error } = await withSupabaseTimeout(query)
    if (!error && data) return filterData(mergeProducts(cachedProducts, data))
  } catch {}
  return fallback()
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.source) body.source = "manual"
  const supabase = await getSupabaseClient()

  // Dedup check
  if (body.name) {
    const newName = normalizeProductName(body.name)
    const cachedProducts = await readCachedProducts()
    const localDup = mergeProducts(cachedProducts, localProducts).find((p: any) => {
      const existingName = normalizeProductName(p.name || "")
      return existingName === newName || existingName.includes(newName) || newName.includes(existingName)
    })
    if (localDup) return apiError("重复产品: 已存在 '" + localDup.name + "'", 409)

    if (supabase) {
      try {
        const { data: existing } = await withSupabaseTimeout(supabase.from("products").select("id,name").limit(50))
      if (existing) {
        const dup = existing.find((p: any) => {
          const existingName = normalizeProductName(p.name || "")
          return existingName === newName || existingName.includes(newName) || newName.includes(existingName)
        })
        if (dup) return apiError("重复产品: 已存在 '" + dup.name + "'", 409)
      }
      } catch {}
    }
  }

  if (!supabase) {
    return apiResponse(await createLocalProduct(body), 201)
  }
  try {
    const { data, error } = await withSupabaseTimeout(supabase.from("products").insert(body).select().single())
    if (!error && data) {
      const cached = await readCachedProducts()
      cached.unshift(data)
      await writeCachedProducts(mergeProducts(cached, []))
      return apiResponse(data, 201)
    }
  } catch {}
  return apiResponse(await createLocalProduct(body), 201)
}
