import { promises as fs } from "fs"
import { dataPath } from "@/lib/data-dir"
import { queryOne, queryRows } from "@/lib/postgres"

export type CandidateStatus = "new" | "observing" | "supply_checking" | "scored" | "promoted" | "rejected"
export type SupplyStatus = "matched" | "partial_match" | "not_found" | "blocked" | "needs_manual_review"
export type RiskLevel = "safe" | "warning" | "blocked"

export interface SupplyMatch {
  status: SupplyStatus
  url: string | null
  title: string | null
  price: number | null
  moq: number | null
  supplierName: string | null
  reason: string
}

export interface CandidateScore {
  total: number
  confidence: "low" | "medium" | "high"
  recommendedAction: "observe" | "verify_supply" | "test_listing" | "scale" | "reject"
  dimensions: {
    trendStrength: number
    growth: number
    supply: number
    profit: number
    contentFit: number
    risk: number
  }
}

export interface TrendCandidate {
  id: string
  name: string
  originalTitle: string
  description: string
  platform: string
  sourceUrl: string | null
  heat: number
  growth: number
  priceBand: string
  targetAudience: string
  contentScene: string
  category: string
  keywords: string[]
  status: CandidateStatus
  riskLevel: RiskLevel
  supply: SupplyMatch | null
  score: CandidateScore | null
  createdAt: string
  updatedAt: string
}

const CACHE_FILE = ".trend-candidates-cache.json"

const seedCandidates: TrendCandidate[] = [
  normalizeCandidateInput({
    id: "trend-1",
    title: "桌面理线收纳盒",
    description: "小红书办公桌改造内容高频出现，适合收纳和桌搭场景。",
    platform: "xiaohongshu",
    sourceUrl: "https://www.xiaohongshu.com/search_result?keyword=%E6%A1%8C%E9%9D%A2%E6%94%B6%E7%BA%B3",
    heat: 86,
    growth: 34,
    priceBand: "29-59",
    targetAudience: "学生、上班族、桌搭用户",
    contentScene: "桌面改造、租房收纳、办公效率",
    category: "home",
    keywords: ["桌面收纳", "理线", "办公桌"],
  }),
  {
    ...normalizeCandidateInput({
      id: "trend-2",
      title: "便携露营氛围灯",
      description: "短视频露营清单里反复出现，适合小红书场景化种草。",
      platform: "douyin",
      sourceUrl: "https://www.douyin.com/search/%E9%9C%B2%E8%90%A5%E7%81%AF",
      heat: 78,
      growth: 28,
      priceBand: "39-99",
      targetAudience: "露营用户、车载用户、礼品用户",
      contentScene: "露营、夜钓、车载应急",
      category: "sports",
      keywords: ["露营灯", "氛围灯", "户外"],
    }),
    supply: verifySupplyFromInput({
      url: "https://detail.1688.com/offer/721000001.html",
      title: "LED便携露营氛围灯",
      price: 18,
      moq: 2,
      supplierName: "义乌户外用品工厂",
    }),
  },
]

seedCandidates[1].score = calculateCandidateScore({
  heat: seedCandidates[1].heat,
  growth: seedCandidates[1].growth,
  supplyStatus: seedCandidates[1].supply?.status,
  supplyPrice: seedCandidates[1].supply?.price,
  suggestedPrice: 69,
  contentFit: 8,
  riskLevel: seedCandidates[1].riskLevel,
})
seedCandidates[1].status = "scored"

function now() {
  return new Date().toISOString()
}

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") return value.split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean)
  return []
}

export function normalizeCandidateInput(input: any): TrendCandidate {
  const createdAt = input.createdAt || input.created_at || now()
  const name = String(input.name || input.title || input.originalTitle || input.original_title || "").trim()
  if (!name) throw new Error("候选商品名称不能为空")

  return {
    id: String(input.id || `trend-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name,
    originalTitle: String(input.originalTitle || input.original_title || input.title || name),
    description: String(input.description || "待补充趋势证据"),
    platform: String(input.platform || "manual"),
    sourceUrl: input.sourceUrl || input.source_url ? String(input.sourceUrl || input.source_url) : null,
    heat: clamp(toNumber(input.heat, 50)),
    growth: clamp(toNumber(input.growth, 10)),
    priceBand: String(input.priceBand || input.price_band || "待验证"),
    targetAudience: String(input.targetAudience || input.target_audience || "待验证"),
    contentScene: String(input.contentScene || input.content_scene || "待验证"),
    category: String(input.category || "other"),
    keywords: normalizeKeywords(input.keywords),
    status: (input.status as CandidateStatus) || "new",
    riskLevel: (input.riskLevel || input.risk_level || "safe") as RiskLevel,
    supply: input.supply || null,
    score: input.score || null,
    createdAt,
    updatedAt: input.updatedAt || input.updated_at || createdAt,
  }
}

export function verifySupplyFromInput(input: any): SupplyMatch {
  const title = String(input.title || "").trim()
  const price = typeof input.price === "number" ? input.price : Number(input.price)
  const hasPrice = Number.isFinite(price) && price > 0
  const missing = []
  if (!title) missing.push("商品名")
  if (!hasPrice) missing.push("价格")

  return {
    status: missing.length ? "needs_manual_review" : "matched",
    url: input.url ? String(input.url) : null,
    title: title || null,
    price: hasPrice ? price : null,
    moq: Number.isFinite(Number(input.moq)) ? Number(input.moq) : null,
    supplierName: input.supplierName || input.supplier_name ? String(input.supplierName || input.supplier_name) : null,
    reason: missing.length ? `缺少${missing.join("、")}，不能视为供货验证成功` : "1688 供货信息已具备商品名和价格",
  }
}

export function calculateCandidateScore(input: any): CandidateScore {
  const trendStrength = clamp(toNumber(input.heat) * 0.25)
  const growth = clamp(toNumber(input.growth) * 0.5)
  const supply = input.supplyStatus === "matched" ? 20 : input.supplyStatus === "partial_match" ? 10 : 0
  const supplyPrice = toNumber(input.supplyPrice)
  const suggestedPrice = toNumber(input.suggestedPrice)
  const margin = supplyPrice > 0 && suggestedPrice > 0 ? ((suggestedPrice - supplyPrice) / suggestedPrice) * 100 : 0
  const profit = clamp(margin * 0.15, 0, 15)
  const contentFit = clamp(toNumber(input.contentFit, 5) * 1.25, 0, 10)
  const risk = input.riskLevel === "blocked" ? 0 : input.riskLevel === "warning" ? 5 : 10
  const total = Math.round((trendStrength + growth + supply + profit + contentFit + risk) * 100) / 100
  const confidence = input.supplyStatus === "matched" && total >= 75 ? "high" : input.supplyStatus === "matched" ? "medium" : "low"
  const recommendedAction =
    input.riskLevel === "blocked" ? "reject" :
    input.supplyStatus !== "matched" ? "verify_supply" :
    total >= 85 ? "scale" :
    total >= 65 ? "test_listing" :
    "observe"

  return { total, confidence, recommendedAction, dimensions: { trendStrength, growth, supply, profit, contentFit, risk } }
}

export function buildPromotionProduct(candidate: any) {
  if (candidate.supply?.status !== "matched") throw new Error("候选商品未通过供货验证，不能加入产品池")
  return {
    name: candidate.name,
    description: candidate.description,
    category: candidate.category || "other",
    source: "hot_radar",
    source_url: candidate.supply.url || candidate.sourceUrl || null,
    price: candidate.supply.price ? Math.round(candidate.supply.price * 2.8 * 100) / 100 : null,
    cost: candidate.supply.price || null,
    tags: candidate.keywords || [],
    status: "draft",
    risk_level: candidate.riskLevel || "safe",
  }
}

function fromDb(row: any): TrendCandidate {
  return normalizeCandidateInput({
    ...row,
    originalTitle: row.original_title,
    sourceUrl: row.source_url,
    priceBand: row.price_band,
    targetAudience: row.target_audience,
    contentScene: row.content_scene,
    riskLevel: row.risk_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

async function dbList(): Promise<TrendCandidate[] | null> {
  try {
    const rows = await queryRows("SELECT * FROM trend_candidates ORDER BY created_at DESC")
    return rows.map(fromDb)
  } catch {
    return null
  }
}

async function dbUpsert(candidate: TrendCandidate) {
  return queryOne(
    `INSERT INTO trend_candidates (
      id, name, original_title, description, platform, source_url, heat, growth, price_band,
      target_audience, content_scene, category, keywords, status, risk_level, supply, score, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      original_title = EXCLUDED.original_title,
      description = EXCLUDED.description,
      platform = EXCLUDED.platform,
      source_url = EXCLUDED.source_url,
      heat = EXCLUDED.heat,
      growth = EXCLUDED.growth,
      price_band = EXCLUDED.price_band,
      target_audience = EXCLUDED.target_audience,
      content_scene = EXCLUDED.content_scene,
      category = EXCLUDED.category,
      keywords = EXCLUDED.keywords,
      status = EXCLUDED.status,
      risk_level = EXCLUDED.risk_level,
      supply = EXCLUDED.supply,
      score = EXCLUDED.score,
      updated_at = EXCLUDED.updated_at
    RETURNING *`,
    [
      candidate.id,
      candidate.name,
      candidate.originalTitle,
      candidate.description,
      candidate.platform,
      candidate.sourceUrl,
      candidate.heat,
      candidate.growth,
      candidate.priceBand,
      candidate.targetAudience,
      candidate.contentScene,
      candidate.category,
      candidate.keywords,
      candidate.status,
      candidate.riskLevel,
      (candidate.supply || null) as any,
      (candidate.score || null) as any,
      candidate.createdAt,
      candidate.updatedAt,
    ],
  )
}

async function readCache(): Promise<TrendCandidate[]> {
  try {
    const rows = JSON.parse(await fs.readFile(await dataPath(CACHE_FILE), "utf-8"))
    return Array.isArray(rows) ? rows.map(normalizeCandidateInput) : []
  } catch {
    return []
  }
}

async function writeCache(rows: TrendCandidate[]) {
  await fs.writeFile(await dataPath(CACHE_FILE), JSON.stringify(rows, null, 2), "utf-8")
}

function mergeCandidates(primary: TrendCandidate[], secondary: TrendCandidate[]) {
  const seen = new Set<string>()
  const merged: TrendCandidate[] = []
  for (const item of [...primary, ...secondary]) {
    const key = item.id || `${item.name}-${item.platform}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

export async function listCandidates() {
  const dbRows = await dbList()
  if (dbRows) return mergeCandidates(dbRows, seedCandidates)
  return mergeCandidates(await readCache(), seedCandidates)
}

export async function createCandidate(input: any) {
  const candidate = normalizeCandidateInput(input)
  const existing = (await listCandidates()).find((item) => item.id === candidate.id)
  if (existing?.status === "promoted") return existing
  try {
    const row = await dbUpsert(candidate)
    if (row) return fromDb(row)
  } catch {}

  const rows = await listCandidates()
  rows.unshift(candidate)
  await writeCache(rows.filter((row) => !seedCandidates.some((seed) => seed.id === row.id)))
  return candidate
}

export async function bulkImportCandidates(rows: any[]) {
  const created: TrendCandidate[] = []
  for (const row of rows) created.push(await createCandidate(row))
  return created
}

export async function updateCandidate(id: string, updater: (candidate: TrendCandidate) => TrendCandidate) {
  const rows = await listCandidates()
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error("候选商品不存在")
  rows[index] = updater(rows[index])
  rows[index].updatedAt = now()

  try {
    const row = await dbUpsert(rows[index])
    if (row) return fromDb(row)
  } catch {}

  await writeCache(rows.filter((row) => !seedCandidates.some((seed) => seed.id === row.id)))
  return rows[index]
}

export async function verifyCandidateSupply(id: string, input: any) {
  return updateCandidate(id, (candidate) => ({
    ...candidate,
    supply: verifySupplyFromInput(input),
    status: "supply_checking",
  }))
}

export async function scoreCandidate(id: string) {
  return updateCandidate(id, (candidate) => ({
    ...candidate,
    score: calculateCandidateScore({
      heat: candidate.heat,
      growth: candidate.growth,
      supplyStatus: candidate.supply?.status,
      supplyPrice: candidate.supply?.price,
      suggestedPrice: candidate.supply?.price ? candidate.supply.price * 2.8 : 0,
      contentFit: candidate.contentScene === "待验证" ? 5 : 8,
      riskLevel: candidate.riskLevel,
    }),
    status: "scored",
  }))
}

export async function promoteCandidate(id: string) {
  return updateCandidate(id, (candidate) => {
    buildPromotionProduct(candidate)
    return { ...candidate, status: "promoted" }
  })
}
