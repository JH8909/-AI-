export function toChatCompletionsUrl(baseURL?: string): string {
  const base = baseURL || "https://api.deepseek.com/v1"
  return base.replace(/\/+$/, "") + "/chat/completions"
}

export function isAllowedProductUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "detail.1688.com" && url.pathname.startsWith("/offer/")
  } catch {
    return false
  }
}

export function extractOfferId(value: string): string | null {
  try {
    const url = new URL(value)
    const match = url.pathname.match(/\/offer\/(\d+)/)
    return match?.[1] || null
  } catch {
    return null
  }
}

export function parseScraperJson(stdout: string): any {
  const text = String(stdout || "").trim()
  const start = text.lastIndexOf("\n{")
  const jsonText = start >= 0 ? text.slice(start + 1) : text
  return JSON.parse(jsonText)
}

export function createScraperProcessEnv(baseEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
  }
}

export function normalizeImportedProduct(raw: any, sourceUrl: string) {
  const offerId = extractOfferId(sourceUrl)
  const name = String(raw?.name || "").trim() || (offerId ? `1688商品 ${offerId}` : "1688商品")
  const description = String(raw?.description || "").trim() || "从1688链接提取的商品，请补充卖点描述"
  const tags = Array.isArray(raw?.tags) && raw.tags.length > 0
    ? raw.tags
    : [name, description].join(" ").match(/[\u4e00-\u9fa5A-Za-z0-9]{2,}/g)?.slice(0, 5) || []

  return {
    name,
    description,
    category: raw?.category || "other",
    price: typeof raw?.price === "number" ? raw.price : null,
    cost: typeof raw?.cost === "number" ? raw.cost : null,
    images: Array.isArray(raw?.images) ? raw.images : [],
    specs: raw?.specs || {},
    tags,
    source_url: sourceUrl,
    source: "link_parse",
  }
}

export function hasRequired1688ProductEvidence(raw: any): boolean {
  const name = String(raw?.name || "").trim()
  const price = typeof raw?.price === "number" ? raw.price : Number(raw?.price)
  if (!name || !Number.isFinite(price) || price <= 0) return false
  if (/^1688商品\s*\d*$/i.test(name)) return false
  return true
}

export function parseProductLink(url: string): { name?: string; price?: number; platform?: string } {
  try {
    const u = new URL(url)
    const platform = u.hostname.replace("www.", "").split(".")[0]
    const name = u.pathname.split("/").filter(Boolean).pop() || u.pathname
    return { platform, name: decodeURIComponent(name.slice(0, 50)), price: undefined }
  } catch {
    return {}
  }
}
