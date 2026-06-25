const test = require("node:test")
const assert = require("node:assert/strict")

const { buildPendingPublishRecord, mergePublishRecord } = require("./publish-records-utils")

test("builds a pending publish record from an approved review item", () => {
  const record = buildPendingPublishRecord({
    contentDraftId: "draft-1",
    product_id: "product-1",
    productName: "desk lamp",
    platform: "xiaohongshu",
    title: "desk setup",
    body: "draft body",
  }, "2026-06-25")

  assert.equal(record.content_draft_id, "draft-1")
  assert.equal(record.product_id, "product-1")
  assert.equal(record.productName, "desk lamp")
  assert.equal(record.platform, "xiaohongshu")
  assert.equal(record.status, "pending_publish")
  assert.equal(record.snapshot_date, "2026-06-25")
  assert.equal(record.publish_url, "")
})

test("merges pending publish records by content draft id", () => {
  const existing = [{ id: "record-1", content_draft_id: "draft-1", status: "pending_publish" }]
  const merged = mergePublishRecord(existing, { content_draft_id: "draft-1", status: "pending_publish", title: "updated" })

  assert.equal(merged.length, 1)
  assert.equal(merged[0].id, "record-1")
  assert.equal(merged[0].title, "updated")
})
