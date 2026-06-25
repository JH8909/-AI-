function normalizePriceSuggestion(value) {
  if (value == null || value === "") return null
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

module.exports = {
  normalizePriceSuggestion,
}
