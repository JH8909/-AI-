function normalizeKeywords(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean)
  return []
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeCandidateInput(input) {
  const createdAt = input.createdAt || new Date().toISOString()
  const name = String(input.name || input.title || input.originalTitle || "").trim()
  if (!name) throw new Error("候选商品名称不能为空")
  return {
    id: String(input.id || `trend-${Date.now()}`),
    name,
    originalTitle: String(input.originalTitle || input.title || name),
    description: String(input.description || "待补充趋势证据"),
    platform: String(input.platform || "manual"),
    sourceUrl: input.sourceUrl ? String(input.sourceUrl) : null,
    heat: clamp(toNumber(input.heat, 50)),
    growth: clamp(toNumber(input.growth, 10)),
    priceBand: String(input.priceBand || "待验证"),
    targetAudience: String(input.targetAudience || "待验证"),
    contentScene: String(input.contentScene || "待验证"),
    category: String(input.category || "other"),
    keywords: normalizeKeywords(input.keywords),
    status: input.status || "new",
    riskLevel: input.riskLevel || "safe",
    supply: input.supply || null,
    score: input.score || null,
    createdAt,
    updatedAt: input.updatedAt || createdAt,
  }
}

function verifySupplyFromInput(input) {
  const title = String(input.title || "").trim()
  const price = typeof input.price === "number" ? input.price : Number(input.price)
  const hasPrice = Number.isFinite(price) && price > 0
  const missing = []
  if (!title) missing.push("商品名")
  if (!hasPrice) missing.push("价格")
  return {
    status: missing.length ? "needs_manual_review" : "matched",
    url: input.url ? String(input.url) : null,
    title: title || null,
    price: hasPrice ? price : null,
    moq: Number.isFinite(Number(input.moq)) ? Number(input.moq) : null,
    supplierName: input.supplierName ? String(input.supplierName) : null,
    reason: missing.length ? `缺少${missing.join("、")}，不能视为供货验证成功` : "1688 供货信息已具备商品名和价格",
  }
}

function calculateCandidateScore(input) {
  const trendStrength = clamp(toNumber(input.heat) * 0.25)
  const growth = clamp(toNumber(input.growth) * 0.5)
  const supply = input.supplyStatus === "matched" ? 20 : input.supplyStatus === "partial_match" ? 10 : 0
  const supplyPrice = toNumber(input.supplyPrice)
  const suggestedPrice = toNumber(input.suggestedPrice)
  const margin = supplyPrice > 0 && suggestedPrice > 0 ? ((suggestedPrice - supplyPrice) / suggestedPrice) * 100 : 0
  const profit = clamp(margin * 0.15, 0, 15)
  const contentFit = clamp(toNumber(input.contentFit, 5) * 1.25, 0, 10)
  const risk = input.riskLevel === "blocked" ? 0 : input.riskLevel === "warning" ? 5 : 10
  const total = Math.round((trendStrength + growth + supply + profit + contentFit + risk) * 100) / 100
  const confidence = input.supplyStatus === "matched" && total >= 75 ? "high" : input.supplyStatus === "matched" ? "medium" : "low"
  const recommendedAction =
    input.riskLevel === "blocked" ? "reject" :
    input.supplyStatus !== "matched" ? "verify_supply" :
    total >= 85 ? "scale" :
    total >= 65 ? "test_listing" :
    "observe"
  return { total, confidence, recommendedAction, dimensions: { trendStrength, growth, supply, profit, contentFit, risk } }
}

function buildPromotionProduct(candidate) {
  if (candidate.supply?.status !== "matched") throw new Error("候选商品未通过供货验证，不能加入产品池")
  return {
    name: candidate.name,
    description: candidate.description,
    category: candidate.category || "other",
    source: "hot_radar",
    source_url: candidate.supply.url || candidate.sourceUrl || null,
    price: candidate.supply.price ? Math.round(candidate.supply.price * 2.8 * 100) / 100 : null,
    cost: candidate.supply.price || null,
    tags: candidate.keywords || [],
    status: "draft",
    risk_level: candidate.riskLevel || "safe",
  }
}

module.exports = {
  normalizeCandidateInput,
  verifySupplyFromInput,
  calculateCandidateScore,
  buildPromotionProduct,
}
