import { createCandidate, listCandidates, scoreCandidate, verifyCandidateSupply, buildPromotionProduct, promoteCandidate } from "@/lib/trend-candidates-store"
import { normalizeDbProduct, queryOne } from "@/lib/postgres"

export interface AutomationRunOptions {
  promoteThreshold?: number
  maxPromotions?: number
  seedOnly?: boolean
}

const curatedTrendInputs = [
  {
    id: "auto-desk-cable-box",
    name: "桌面理线收纳盒",
    originalTitle: "小红书桌搭改造高频收纳单品",
    description: "适合桌面改造、租房收纳、办公效率内容，客单价低，适合小红书和闲鱼测试。",
    platform: "xiaohongshu",
    sourceUrl: "https://www.xiaohongshu.com/search_result?keyword=%E6%A1%8C%E9%9D%A2%E7%90%86%E7%BA%BF",
    heat: 88,
    growth: 36,
    priceBand: "29-59",
    targetAudience: "学生、上班族、桌搭用户",
    contentScene: "桌面改造、办公效率、租房收纳",
    category: "home",
    keywords: ["桌面收纳", "理线", "桌搭"],
    supply: {
      url: "https://detail.1688.com/offer/auto-desk-cable-box.html",
      title: "桌面理线收纳盒",
      price: 12.8,
      moq: 2,
      supplierName: "义乌家居收纳工厂",
    },
  },
  {
    id: "auto-camping-lantern",
    name: "便携露营氛围灯",
    originalTitle: "露营清单高频出现的氛围灯",
    description: "适合露营、夜钓、车载应急内容，素材场景丰富。",
    platform: "douyin",
    sourceUrl: "https://www.douyin.com/search/%E9%9C%B2%E8%90%A5%E7%81%AF",
    heat: 82,
    growth: 31,
    priceBand: "39-99",
    targetAudience: "露营用户、车载用户、礼品用户",
    contentScene: "露营、夜钓、车载应急",
    category: "sports",
    keywords: ["露营灯", "氛围灯", "户外"],
    supply: {
      url: "https://detail.1688.com/offer/auto-camping-lantern.html",
      title: "LED便携露营氛围灯",
      price: 18,
      moq: 2,
      supplierName: "户外用品工厂",
    },
  },
]

async function createProduct(payload: any) {
  const existing = await queryOne(
    "SELECT * FROM products WHERE name = $1 OR (source_url IS NOT NULL AND source_url = $2) ORDER BY created_at DESC LIMIT 1",
    [payload.name || "", payload.source_url || null],
  )
  if (existing) return normalizeDbProduct(existing)

  const data = await queryOne(
    `INSERT INTO products (
      name, description, category, source, source_url, price, cost, images, specs, tags, status, risk_level
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      payload.name || "",
      payload.description || "",
      payload.category || "other",
      payload.source || "hot_radar",
      payload.source_url || null,
      payload.price ?? null,
      payload.cost ?? null,
      Array.isArray(payload.images) ? payload.images : [],
      payload.specs || {},
      Array.isArray(payload.tags) ? payload.tags : [],
      payload.status || "draft",
      payload.risk_level || "safe",
    ],
  )
  return normalizeDbProduct(data)
}

async function createDraftForProduct(product: any, candidate: any) {
  const title = `${product.name}，适合先小规模测试的趋势单品`
  const body = [
    `最近看到${candidate.platform || "内容平台"}上${product.name}相关内容热度上升。`,
    `适合场景：${candidate.contentScene || "日常使用"}`,
    `建议先用小红书种草笔记测试点击和咨询，再决定是否扩大备货。`,
  ].join("\n")

  const existing = await queryOne(
    "SELECT * FROM content_drafts WHERE product_id = $1 AND platform = 'xiaohongshu' ORDER BY created_at DESC LIMIT 1",
    [product.id],
  )
  if (existing) return existing

  const draft = await queryOne(
    `INSERT INTO content_drafts (
      product_id, platform, content_type, title, body, hashtags, price_suggestion, image_prompt, status
    ) VALUES ($1,'xiaohongshu','product_post',$2,$3,$4,$5,$6,'pending')
    RETURNING *`,
    [
      product.id,
      title,
      body,
      Array.isArray(product.tags) ? product.tags : [],
      product.price ?? null,
      `${product.name} 场景化产品图，干净背景，突出使用场景`,
    ],
  )

  if (draft) {
    await queryOne(
      `INSERT INTO review_queue (content_draft_id, status, is_high_risk, checklist)
       VALUES ($1, 'pending', false, $2)
       RETURNING *`,
      [draft.id, []],
    ).catch(() => null)
  }
  return draft
}

export async function runAutomationPipeline(options: AutomationRunOptions = {}) {
  const promoteThreshold = options.promoteThreshold ?? 65
  const maxPromotions = options.maxPromotions ?? 2
  const created: any[] = []
  const verified: any[] = []
  const scored: any[] = []
  const promoted: any[] = []
  const drafted: any[] = []

  for (const input of curatedTrendInputs) {
    const candidate = await createCandidate(input)
    created.push(candidate)
    if (candidate.status === "promoted") continue
    if (input.supply) {
      verified.push(await verifyCandidateSupply(candidate.id, input.supply))
    }
    scored.push(await scoreCandidate(candidate.id))
  }

  if (!options.seedOnly) {
    const candidates = await listCandidates()
    const ready = candidates
      .filter((item) => item.status !== "promoted")
      .filter((item) => item.supply?.status === "matched")
      .filter((item) => (item.score?.total || 0) >= promoteThreshold)
      .sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0))
      .slice(0, maxPromotions)

    for (const candidate of ready) {
      try {
        const product = await createProduct(buildPromotionProduct(candidate))
        const draft = await createDraftForProduct(product, candidate)
        const updatedCandidate = await promoteCandidate(candidate.id)
        promoted.push({ candidate: updatedCandidate, product })
        drafted.push({ productId: product.id, draft })
      } catch (err: any) {
        promoted.push({ candidateId: candidate.id, error: err.message || "promote failed" })
      }
    }
  }

  return {
    createdCount: created.length,
    verifiedCount: verified.length,
    scoredCount: scored.length,
    promotedCount: promoted.filter((item) => item.product).length,
    draftedCount: drafted.filter((item) => item.draft).length,
    created,
    verified,
    scored,
    promoted,
    drafted,
  }
}
