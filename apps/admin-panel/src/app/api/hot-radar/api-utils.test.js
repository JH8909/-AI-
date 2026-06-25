const test = require("node:test")
const assert = require("node:assert/strict")

const {
  boundedStringList,
  boundedEnum,
  normalizeScoreDate,
} = require("./api-utils")

test("boundedStringList trims, deduplicates, and limits input", () => {
  assert.deepEqual(boundedStringList([" 手机支架 ", "手机支架", "", "露营灯"], 2), ["手机支架", "露营灯"])
})

test("boundedEnum returns fallback for unsupported values", () => {
  assert.equal(boundedEnum("selected", ["selected", "ignored"], "selected"), "selected")
  assert.equal(boundedEnum("delete", ["selected", "ignored"], "selected"), "selected")
})

test("normalizeScoreDate accepts yyyy-mm-dd and defaults invalid values", () => {
  assert.equal(normalizeScoreDate("2026-06-24"), "2026-06-24")
  assert.match(normalizeScoreDate("bad"), /^\d{4}-\d{2}-\d{2}$/)
})
