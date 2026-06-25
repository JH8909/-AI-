// ============================================
// 中央化 Mock 数据 — 所有 API 降级时使用
// ============================================

export interface MockProduct {
  id: string; name: string; description?: string
  category: string; price: number | null; cost: number | null
  images: string[]; tags: string[]; status: string
  risk_level: string; source: string; source_url: string | null
  created_at: string
}

export const mockProducts: MockProduct[] = [
  { id: "1", name: "极简风桌面手机支架", category: "home", price: 29.90, cost: 12.00, status: "tracking", risk_level: "safe", source: "csv_import", source_url: null, images: [], tags: [], created_at: "2026-06-20T10:00:00Z" },
  { id: "2", name: "无线蓝牙降噪耳机Pro", category: "electronics", price: 199.00, cost: 85.00, status: "testing_candidate", risk_level: "safe", source: "link_parse", source_url: null, images: [], tags: [], created_at: "2026-06-21T14:00:00Z" },
  { id: "3", name: "ins风陶瓷咖啡杯套装", category: "home", price: 49.90, cost: 18.00, status: "draft", risk_level: "safe", source: "manual", source_url: null, images: [], tags: [], created_at: "2026-06-22T09:00:00Z" },
  { id: "4", name: "便携折叠露营椅", category: "sports", price: 89.00, cost: 35.00, status: "published", risk_level: "safe", source: "csv_import", source_url: null, images: [], tags: [], created_at: "2026-06-19T16:00:00Z" },
  { id: "5", name: "LED化妆镜带灯", category: "beauty", price: 59.90, cost: 22.00, status: "draft", risk_level: "warning", source: "link_parse", source_url: null, images: [], tags: [], created_at: "2026-06-22T11:00:00Z" },
  { id: "6", name: "某仿牌运动鞋", category: "fashion", price: 299.00, cost: 60.00, status: "draft", risk_level: "blocked", source: "csv_import", source_url: null, images: [], tags: [], created_at: "2026-06-23T08:00:00Z" },
]

export interface MockScore {
  id: string; product_id: string; productName: string
  market_demand: number; profit_margin: number
  competition_intensity: number; compliance_risk: number
  content_fit: number; overall_score: number
  reasoning: string; model_used: string
  created_at: string
}

export const mockScores: MockScore[] = [
  { id: "s1", product_id: "1", productName: "极简风桌面手机支架", market_demand: 8, profit_margin: 7, competition_intensity: 5, compliance_risk: 2, content_fit: 9, overall_score: 7.8, reasoning: "该产品市场需求稳定，利润空间良好（毛利约60%），竞争中等但差异化空间大，合规风险低，内容适配度极高。综合推荐。", model_used: "deepseek-v3", created_at: "2026-06-22" },
  { id: "s2", product_id: "2", productName: "无线蓝牙降噪耳机Pro", market_demand: 9, profit_margin: 6, competition_intensity: 8, compliance_risk: 4, content_fit: 7, overall_score: 6.8, reasoning: "市场需求强烈，但竞争激烈（大品牌主导），利润空间被压缩。需关注合规（电子产品认证）。", model_used: "deepseek-v3", created_at: "2026-06-21" },
]

export interface MockCompetitorAnalysis {
  id: string; productName: string
  priceComparison: string; differentiation: string
  contentStrategy: string; overallReport: string
  competitors: Array<{ name: string; price: number; platform: string; strengths: string[]; weaknesses: string[] }>
  created_at: string
}

export const mockAnalyses: MockCompetitorAnalysis[] = [
  { id: "c1", productName: "极简风桌面手机支架",
    priceComparison: "本产品定价29.90元，处于市场中低价位。相比品牌A便宜25%，相比品牌C便宜49%。",
    differentiation: "核心差异化：极简设计+铝合金材质+折叠便携。市场上多数产品要么偏重功能、要么偏低价。",
    contentStrategy: "建议内容方向：桌面美学场景拍摄、办公效率vlog植入、极简生活方式的延伸内容。",
    overallReport: "综合评估：该产品具备良好的市场竞争力。核心优势是差异化定位清晰、价格适中。",
    competitors: [
      { name: "某品牌A铝合金支架", price: 39.90, platform: "淘宝", strengths: ["品牌知名度", "包装精美"], weaknesses: ["价格偏高", "设计普通"] },
      { name: "某品牌B塑料支架", price: 15.90, platform: "拼多多", strengths: ["价格极低", "销量大"], weaknesses: ["材质差", "质感廉价"] },
    ],
    created_at: "2026-06-23"
  }
]

export interface MockContentDraft {
  id: string; productName: string; platform: string
  title: string; body: string; hashtags: string[]
  priceSuggestion: number | null; status: string
  created_at: string
}

export const mockDrafts: MockContentDraft[] = [
  { id: "d1", productName: "极简风桌面手机支架", platform: "xiaohongshu", title: "桌面改造｜30块搞定ins风工作台", body: "最近改造了桌面，发现这个30块的手机支架真的绝了！铝合金材质超有质感，折叠起来只有巴掌大。直播、追剧、办公都能用，一物三用太值了！#桌面改造 #平价好物 #办公神器", hashtags: ["桌面改造", "平价好物", "办公神器"], priceSuggestion: 29.90, status: "pending", created_at: "2026-06-22T15:00:00Z" },
  { id: "d2", productName: "极简风桌面手机支架", platform: "xianyu", title: "全新铝合金手机支架 桌面懒人神器", body: "全新未拆封，铝合金材质，可折叠便携。多角度调节。原价39.9，现29.9。", hashtags: [], priceSuggestion: 29.90, status: "approved", created_at: "2026-06-22T16:00:00Z" },
  { id: "d3", productName: "无线蓝牙降噪耳机Pro", platform: "xiaohongshu", title: "百元降噪耳机天花板？用了7天真香", body: "200不到买到了ANC降噪耳机！40小时续航+低延迟游戏模式，学生党闭眼入！#降噪耳机 #学生党好物", hashtags: ["降噪耳机", "学生党好物", "蓝牙耳机推荐"], priceSuggestion: 199.00, status: "pending", created_at: "2026-06-23T09:00:00Z" },
]

export interface MockReviewItem {
  id: string; contentDraftId: string; productName: string
  platform: string; title: string; body: string
  status: string; riskNote?: string
  created_at: string
}

export const mockReviewQueue: MockReviewItem[] = [
  { id: "r1", contentDraftId: "d1", productName: "极简风桌面手机支架", platform: "xiaohongshu", title: "桌面改造｜30块搞定ins风工作台", body: "最近改造了桌面...", status: "pending", created_at: "2026-06-22T15:00:00Z" },
  { id: "r2", contentDraftId: "d3", productName: "无线蓝牙降噪耳机Pro", platform: "xiaohongshu", title: "百元降噪耳机天花板？用了7天真香", body: "200不到买到了ANC降噪耳机...", status: "pending", created_at: "2026-06-23T09:00:00Z" },
  { id: "r3", contentDraftId: "d5", productName: "LED化妆镜带灯（高风险）", platform: "xianyu", title: "全新LED化妆镜带灯 女生必备", body: "全新LED化妆镜，三色灯光可调。", status: "pending", riskNote: "产品分类为美妆，但描述涉及美容器具，需确认合规性", created_at: "2026-06-23T10:00:00Z" },
]

export interface MockSnapshot {
  date: string; views: number; likes: number; shares: number; sales: number
}

export const mockSnapshots: MockSnapshot[] = [
  { date: "06-16", views: 120, likes: 18, shares: 5, sales: 3 },
  { date: "06-17", views: 156, likes: 24, shares: 8, sales: 5 },
  { date: "06-18", views: 203, likes: 31, shares: 12, sales: 7 },
  { date: "06-19", views: 189, likes: 28, shares: 9, sales: 6 },
  { date: "06-20", views: 245, likes: 42, shares: 15, sales: 9 },
  { date: "06-21", views: 310, likes: 56, shares: 22, sales: 14 },
  { date: "06-22", views: 278, likes: 48, shares: 18, sales: 11 },
]

export const recapSummary = `【7天复盘报告】

1. 曝光趋势：7天内浏览量从120增长到278，整体上涨132%。
2. 互动表现：点赞率稳定在15-18%，分享率约6-8%。
3. 转化数据：7天累计销售55件，日均约8件，转化率约3%。
4. 风险提示：第7天数据略有回落（-10%），需关注是否为正常波动。
5. 行动建议：①保持每日1条小红书内容 ②闲鱼开始测试上架 ③准备2-3个变体SKU`

export function apiResponse<T>(data: T, status: number = 200) {
  return Response.json({ success: true, data }, { status })
}

export function apiError(message: string, status: number = 500) {
  return Response.json({ success: false, error: message, data: null }, { status })
}
