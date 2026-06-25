let _nextId = 0
let _rows: any[] = [
  { id: ++_nextId, rank: 1, overall_score: 8.7, confidence: 0.85, products: { name: "铝合金手机支架", source_url: "" }, source_keyword: "手机支架" },
  { id: ++_nextId, rank: 2, overall_score: 8.5, confidence: 0.80, products: { name: "桌面收纳盒", source_url: "" }, source_keyword: "桌面收纳" },
  { id: ++_nextId, rank: 3, overall_score: 7.9, confidence: 0.72, products: { name: "LED露营灯", source_url: "" }, source_keyword: "露营灯" },
]

export function getRankings() { return _rows }

export function generateRankings() {
  const products = [
    { name: "铝合金手机支架", kw: "手机支架" },
    { name: "桌面收纳盒", kw: "桌面收纳" },
    { name: "LED露营灯", kw: "露营灯" },
    { name: "便携折叠椅", kw: "露营灯" },
    { name: "多功能充电宝", kw: "手机支架" },
  ]
  const count = Math.floor(Math.random() * 3) + 3
  _rows = products.slice(0, count).map((p, i) => ({
    id: ++_nextId, rank: i + 1,
    overall_score: +(8.8 - i * 0.4 + Math.random() * 0.3).toFixed(2),
    confidence: +(0.85 - i * 0.05 - Math.random() * 0.05).toFixed(2),
    products: { name: p.name, source_url: "" },
    source_keyword: p.kw,
  }))
  return _rows
}
