const test = require("node:test")
const assert = require("node:assert/strict")

const {
  normalizeCandidateInput,
  verifySupplyFromInput,
  calculateCandidateScore,
  buildPromotionProduct,
} = require("./trend-candidates-store.test-helper")

test("normalizes a cross-platform candidate", () => {
  const candidate = normalizeCandidateInput({
    title: "桌面理线收纳盒",
    platform: "xiaohongshu",
    sourceUrl: "https://example.com/note/1",
    heat: 82,
    growth: 31,
    priceBand: "29-59",
    keywords: ["收纳", "桌面"],
  })

  assert.equal(candidate.name, "桌面理线收纳盒")
  assert.equal(candidate.platform, "xiaohongshu")
  assert.equal(candidate.status, "new")
  assert.deepEqual(candidate.keywords, ["收纳", "桌面"])
})

test("supply verification fails when required 1688 evidence is missing", () => {
  const result = verifySupplyFromInput({ url: "https://detail.1688.com/offer/123.html", title: "", price: null })
  assert.equal(result.status, "needs_manual_review")
  assert.match(result.reason, /商品名|价格/)
})

test("scores candidate from trend, supply, profit, content, and risk", () => {
  const score = calculateCandidateScore({
    heat: 80,
    growth: 40,
    supplyStatus: "matched",
    supplyPrice: 12,
    suggestedPrice: 49,
    contentFit: 8,
    riskLevel: "safe",
  })

  assert.equal(score.total > 70, true)
  assert.equal(score.recommendedAction, "scale")
})

test("builds product payload only from verified candidate", () => {
  const product = buildPromotionProduct({
    id: "c1",
    name: "桌面理线收纳盒",
    description: "多平台升温商品",
    category: "home",
    keywords: ["收纳"],
    supply: { status: "matched", url: "https://detail.1688.com/offer/123.html", price: 12 },
    score: { total: 82 },
  })

  assert.equal(product.name, "桌面理线收纳盒")
  assert.equal(product.source, "hot_radar")
  assert.equal(product.cost, 12)
})
