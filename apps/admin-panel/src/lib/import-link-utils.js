function isAllowedProductUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "detail.1688.com" && url.pathname.startsWith("/offer/")
  } catch {
    return false
  }
}

function parseScraperJson(stdout) {
  const text = String(stdout || "").trim()
  const start = text.lastIndexOf("\n{")
  const jsonText = start >= 0 ? text.slice(start + 1) : text
  return JSON.parse(jsonText)
}

function toChatCompletionsUrl(baseURL) {
  const fallback = "https://api.deepseek.com/v1"
  const base = String(baseURL || fallback).replace(/\/+$/, "")
  if (base.endsWith("/chat/completions")) return base
  return `${base}/chat/completions`
}

module.exports = {
  isAllowedProductUrl,
  parseScraperJson,
  toChatCompletionsUrl,
}
