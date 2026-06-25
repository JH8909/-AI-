function isAllowedProductUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "detail.1688.com" && url.pathname.startsWith("/offer/")
  } catch {
    return false
  }
}

function extractOfferId(value) {
  try {
    const url = new URL(value)
    const match = url.pathname.match(/\/offer\/(\d+)/)
    return (match && match[1]) || null
  } catch {
    return null
  }
}

function parseScraperJson(stdout) {
  const text = String(stdout || "").trim()
  const start = text.lastIndexOf("\n{")
  const jsonText = start >= 0 ? text.slice(start + 1) : text
  return JSON.parse(jsonText)
}

function createScraperProcessEnv(baseEnv) {
  return {
    ...baseEnv,
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
  }
}

function normalizeImportedProduct(raw, sourceUrl) {
  const offerId = extractOfferId(sourceUrl)
  const name = String((raw && raw.name) || "").trim() || (offerId ? `1688商品 ${offerId}` : "1688商品")
  const description = String((raw && raw.description) || "").trim() || "从1688链接提取的商品，请补充卖点描述"
  const tags = Array.isArray(raw && raw.tags) && raw.tags.length > 0
    ? raw.tags
    : (([name, description].join(" ").match(/[\u4e00-\u9fa5A-Za-z0-9]{2,}/g) || []).slice(0, 5))

  return {
    name,
    description,
    category: (raw && raw.category) || "other",
    price: typeof (raw && raw.price) === "number" ? raw.price : null,
    cost: typeof (raw && raw.cost) === "number" ? raw.cost : null,
    images: Array.isArray(raw && raw.images) ? raw.images : [],
    specs: (raw && raw.specs) || {},
    tags,
    source_url: sourceUrl,
    source: "link_parse",
  }
}

function hasRequired1688ProductEvidence(raw) {
  const name = String((raw && raw.name) || "").trim()
  const price = typeof (raw && raw.price) === "number" ? raw.price : Number(raw && raw.price)
  if (!name || !Number.isFinite(price) || price <= 0) return false
  if (/^1688商品\s*\d*$/i.test(name)) return false
  return true
}

function toChatCompletionsUrl(baseURL) {
  const fallback = "https://api.deepseek.com/v1"
  const base = String(baseURL || fallback).replace(/\/+$/, "")
  if (base.endsWith("/chat/completions")) return base
  return `${base}/chat/completions`
}

module.exports = {
  createScraperProcessEnv,
  extractOfferId,
  hasRequired1688ProductEvidence,
  isAllowedProductUrl,
  normalizeImportedProduct,
  parseScraperJson,
  toChatCompletionsUrl,
}
