function normalizeRunLimit(limit) {
  return Math.min(Math.max(Number(limit) || 20, 1), 100)
}

function toJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value
  return value == null ? {} : { value }
}

module.exports = {
  normalizeRunLimit,
  toJsonObject,
}
