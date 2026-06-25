function boundedStringList(values, limit = 20) {
  const seen = new Set()
  const result = []
  for (const value of Array.isArray(values) ? values : []) {
    const text = String(value || "").trim().replace(/\s+/g, " ")
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function boundedEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function normalizeScoreDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return String(value)
  return new Date().toISOString().slice(0, 10)
}

async function readJson(req) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

module.exports = {
  boundedStringList,
  boundedEnum,
  normalizeScoreDate,
  readJson,
}
