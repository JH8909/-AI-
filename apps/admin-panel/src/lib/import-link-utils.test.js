const test = require("node:test")
const assert = require("node:assert/strict")

const {
  isAllowedProductUrl,
  parseScraperJson,
  toChatCompletionsUrl,
} = require("./import-link-utils")

test("only allows public 1688 detail links", () => {
  assert.equal(isAllowedProductUrl("https://detail.1688.com/offer/123.html"), true)
  assert.equal(isAllowedProductUrl("https://item.jd.com/123.html"), false)
  assert.equal(isAllowedProductUrl("not a url"), false)
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

test("normalizes LLM base URL to chat completions endpoint", () => {
  assert.equal(toChatCompletionsUrl(""), "https://api.deepseek.com/v1/chat/completions")
  assert.equal(toChatCompletionsUrl("https://api.deepseek.com/v1"), "https://api.deepseek.com/v1/chat/completions")
  assert.equal(toChatCompletionsUrl("https://api.deepseek.com/v1/chat/completions"), "https://api.deepseek.com/v1/chat/completions")
})
