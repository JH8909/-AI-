const test = require("node:test")
const assert = require("node:assert/strict")

const {
  createScraperProcessEnv,
  extractOfferId,
  isAllowedProductUrl,
  normalizeImportedProduct,
  hasRequired1688ProductEvidence,
  parseScraperJson,
  toChatCompletionsUrl,
} = require("./import-link-utils")

test("forces scraper subprocess output to UTF-8", () => {
  assert.deepEqual(createScraperProcessEnv({ PATH: "python-bin", PYTHONUTF8: "0" }), {
    PATH: "python-bin",
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
  })
})

test("only allows public 1688 detail links", () => {
  assert.equal(isAllowedProductUrl("https://detail.1688.com/offer/123.html"), true)
  assert.equal(isAllowedProductUrl("https://item.jd.com/123.html"), false)
  assert.equal(isAllowedProductUrl("not a url"), false)
})

test("extracts offer id from 1688 detail links", () => {
  assert.equal(extractOfferId("https://detail.1688.com/offer/123.html"), "123")
  assert.equal(extractOfferId("https://detail.1688.com/page/123.html"), null)
})

test("extracts final JSON object from scraper stdout", () => {
  const stdout = [
    "[解析] 链接: https://detail.1688.com/offer/123.html",
    "[导出] 已写入: parsed_product.json",
    JSON.stringify({ name: "桌面支架", source: "link_parse", source_url: "https://detail.1688.com/offer/123.html" }, null, 2),
  ].join("\n")

  assert.deepEqual(parseScraperJson(stdout), {
    name: "桌面支架",
    source: "link_parse",
    source_url: "https://detail.1688.com/offer/123.html",
  })
})

test("normalizes scraper result with fallback product name", () => {
  assert.deepEqual(normalizeImportedProduct({ name: "", description: "桌面支架", price: 12.5 }, "https://detail.1688.com/offer/123.html"), {
    name: "1688商品 123",
    description: "桌面支架",
    category: "other",
    price: 12.5,
    cost: null,
    images: [],
    specs: {},
    tags: ["1688商品", "123", "桌面支架"],
    source_url: "https://detail.1688.com/offer/123.html",
    source: "link_parse",
  })
})

test("normalizes LLM base URL to chat completions endpoint", () => {
  assert.equal(toChatCompletionsUrl(""), "https://api.deepseek.com/v1/chat/completions")
  assert.equal(toChatCompletionsUrl("https://api.deepseek.com/v1"), "https://api.deepseek.com/v1/chat/completions")
  assert.equal(toChatCompletionsUrl("https://api.deepseek.com/v1/chat/completions"), "https://api.deepseek.com/v1/chat/completions")
})

test("requires concrete 1688 product evidence before treating extraction as successful", () => {
  assert.equal(hasRequired1688ProductEvidence({ name: "桌面支架", price: 12.5 }), true)
  assert.equal(hasRequired1688ProductEvidence({ name: "", price: 12.5 }), false)
  assert.equal(hasRequired1688ProductEvidence({ name: "桌面支架", price: null }), false)
  assert.equal(hasRequired1688ProductEvidence({ name: "1688商品 123", price: 12.5 }), false)
})
