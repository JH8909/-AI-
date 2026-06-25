const test = require("node:test")
const assert = require("node:assert/strict")

const { buildPendingPublishRecord, buildPublishedRecord, mergePublishRecord } = require("./publish-records-utils")

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

test("builds a published record from a release link", () => {
  const record = buildPublishedRecord({
    product_id: "product-1",
    platform: "xianyu",
    publish_url: "https://example.com/item/1",
    publish_time: "2026-06-25",
    title: "desk setup",
  })

  assert.equal(record.product_id, "product-1")
  assert.equal(record.platform, "xianyu")
  assert.equal(record.publish_url, "https://example.com/item/1")
  assert.equal(record.publish_time, "2026-06-25")
  assert.equal(record.status, "published")
})
