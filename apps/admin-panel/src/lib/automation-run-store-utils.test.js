const test = require("node:test")
const assert = require("node:assert/strict")

const { normalizeRunLimit, toJsonObject } = require("./automation-run-store-utils")

test("normalizes automation run history limit", () => {
  assert.equal(normalizeRunLimit(5), 5)
  assert.equal(normalizeRunLimit(0), 20)
  assert.equal(normalizeRunLimit(200), 100)
  assert.equal(normalizeRunLimit("bad"), 20)
})

test("normalizes automation run result to JSON object", () => {
  assert.deepEqual(toJsonObject({ promotedCount: 2 }), { promotedCount: 2 })
  assert.deepEqual(toJsonObject(null), {})
  assert.deepEqual(toJsonObject("failed"), { value: "failed" })
})
