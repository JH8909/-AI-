import { apiResponse } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"
import { readCachedContentDrafts, readCachedReviewItems } from "@/lib/content-drafts-cache"
import { listAutomationRuns } from "@/lib/automation-run-store"
import { listCandidates } from "@/lib/trend-candidates-store"
import { queryOne } from "@/lib/postgres"
import { readCachedProducts } from "@/lib/product-cache"

export const dynamic = "force-dynamic"

async function countDb(sql: string) {
  const row = await queryOne<{ count: string | number }>(sql)
  return Number(row?.count || 0)
}

function countConfiguredSources(value: string) {
  return String(value || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).length
}

export async function GET() {
  await initSettings()
  const settings = getSettings()
  const candidates = await listCandidates()
  const lastRun = (await listAutomationRuns(1))[0] || null

  try {
    const [products, drafts, reviewPending] = await Promise.all([
      countDb("SELECT COUNT(*) FROM products WHERE source = 'hot_radar'"),
      countDb("SELECT COUNT(*) FROM content_drafts"),
      countDb("SELECT COUNT(*) FROM review_queue WHERE status = 'pending'"),
    ])

    return apiResponse({
      storage: "postgres",
      trendCandidates: candidates.length,
      scoredCandidates: candidates.filter((item) => item.score).length,
      verifiedSupply: candidates.filter((item) => item.supply?.status === "matched").length,
      hotRadarProducts: products,
      contentDrafts: drafts,
      pendingReviews: reviewPending,
      trendSourceCount: countConfiguredSources(settings.trendSourceUrls),
      lastRun,
    })
  } catch {
    const [products, drafts, reviews] = await Promise.all([
      readCachedProducts(),
      readCachedContentDrafts(),
      readCachedReviewItems(),
    ])

    return apiResponse({
      storage: "local-cache",
      trendCandidates: candidates.length,
      scoredCandidates: candidates.filter((item) => item.score).length,
      verifiedSupply: candidates.filter((item) => item.supply?.status === "matched").length,
      hotRadarProducts: products.filter((item) => item.source === "hot_radar").length,
      contentDrafts: drafts.length,
      pendingReviews: reviews.filter((item) => item.status === "pending").length,
      trendSourceCount: countConfiguredSources(settings.trendSourceUrls),
      lastRun,
    })
  }
}
