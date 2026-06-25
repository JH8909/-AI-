function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function buildPendingPublishRecord(item, snapshotDate) {
  return {
    content_draft_id: item.content_draft_id || item.contentDraftId || item.id || "",
    product_id: item.product_id || item.productId || "",
    productName: item.productName || item.product_name || item.product_id || "",
    platform: item.platform || "xiaohongshu",
    title: item.title || "",
    body: item.body || "",
    status: "pending_publish",
    publish_url: "",
    snapshot_date: snapshotDate || todayDate(),
    raw_data: {
      type: "publish_record",
      source: "review_approval",
    },
  }
}

function mergePublishRecord(rows, record) {
  const next = Array.isArray(rows) ? [...rows] : []
  const index = next.findIndex((item) => {
    return item.content_draft_id && item.content_draft_id === record.content_draft_id
  })
  if (index >= 0) {
    next[index] = { ...next[index], ...record, id: next[index].id }
    return next
  }
  next.unshift(record)
  return next
}

function isPublishRecord(row) {
  return row?.raw_data?.type === "publish_record" || row?.type === "publish_record" || row?.status === "pending_publish" || row?.status === "published"
}

module.exports = {
  buildPendingPublishRecord,
  isPublishRecord,
  mergePublishRecord,
}
