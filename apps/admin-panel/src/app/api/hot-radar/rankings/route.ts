import { apiResponse } from "@/lib/data/mock-data"
import { listCandidates } from "@/lib/trend-candidates-store"

export async function GET() {
  const rows = (await listCandidates())
    .filter((candidate) => candidate.score)
    .sort((a, b) => (b.score?.total || 0) - (a.score?.total || 0))
    .map((candidate, index) => ({
      id: candidate.id,
      rank: index + 1,
      name: candidate.name,
      platform: candidate.platform,
      sourceUrl: candidate.sourceUrl,
      overall_score: candidate.score?.total || 0,
      confidence: candidate.score?.confidence || "low",
      supplyStatus: candidate.supply?.status || "not_found",
      recommendedAction: candidate.score?.recommendedAction || "observe",
      keywords: candidate.keywords,
    }))
  return apiResponse({ rows, mock: true })
}
