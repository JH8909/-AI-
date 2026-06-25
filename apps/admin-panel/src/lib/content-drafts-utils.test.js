const test = require("node:test")
const assert = require("node:assert/strict")

const { normalizePriceSuggestion } = require("./content-drafts-utils")

test("normalizes database price suggestions to frontend-safe numbers", () => {
  assert.equal(normalizePriceSuggestion("49.90"), 49.9)
  assert.equal(normalizePriceSuggestion(39), 39)
  assert.equal(normalizePriceSuggestion(null), null)
  assert.equal(normalizePriceSuggestion(""), null)
  assert.equal(normalizePriceSuggestion("not-a-number"), null)
})
