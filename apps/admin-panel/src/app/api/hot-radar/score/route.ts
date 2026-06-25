import { apiResponse } from "@/lib/data/mock-data"
import { generateRankings } from "@/lib/rankings-store"

export async function POST() {
  const rows = generateRankings()
  return apiResponse({ scoreDate: new Date().toISOString().slice(0, 10), count: rows.length, rows, mock: true })
}

export async function GET() {
  const { getRankings } = await import("@/lib/rankings-store")
  const rows = getRankings()
  return apiResponse({ scoreDate: new Date().toISOString().slice(0, 10), count: rows.length, rows, mock: true })
}
