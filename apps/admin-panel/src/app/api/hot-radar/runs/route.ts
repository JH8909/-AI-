import { apiResponse } from "@/lib/data/mock-data"
import { queryRows } from "@/lib/postgres"

let _jobId = 10
const _jobs: any[] = [
  { id: 1, cycle_at: new Date(Date.now() - 86400000).toISOString().slice(0, 16), status: "completed", processed_count: 12, monitor_keywords: { keyword: "手机支架" } },
  { id: 2, cycle_at: new Date(Date.now() - 43200000).toISOString().slice(0, 16), status: "completed", processed_count: 8, monitor_keywords: { keyword: "露营灯" } },
  { id: 3, cycle_at: new Date(Date.now() - 21600000).toISOString().slice(0, 16), status: "running", processed_count: 5, monitor_keywords: { keyword: "桌面收纳" } },
]

function mapJob(row: any) {
  return {
    ...row,
    monitor_keywords: { keyword: row.keyword },
  }
}

export async function GET() {
  try {
    const jobs = await queryRows(
      `SELECT cj.*, mk.keyword
       FROM crawl_jobs cj
       LEFT JOIN monitor_keywords mk ON mk.id = cj.keyword_id
       ORDER BY cj.created_at DESC
       LIMIT 20`,
    )
    const countRows = await queryRows<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM monitor_keywords WHERE enabled = true",
    )
    return apiResponse({ enabledKeywordCount: Number(countRows[0]?.count || 0), recentJobs: jobs.map(mapJob) })
  } catch {}
  return apiResponse({ enabledKeywordCount: 3, recentJobs: _jobs, mock: true })
}

export async function POST() {
  try {
    const cycleAt = new Date().toISOString()
    const jobs = await queryRows(
      `INSERT INTO crawl_jobs (keyword_id, cycle_at, status, attempt_count)
       SELECT id, $1, 'pending', 0
       FROM monitor_keywords
       WHERE kind = 'seed' AND enabled = true
       ON CONFLICT (keyword_id, cycle_at) DO NOTHING
       RETURNING *`,
      [cycleAt],
    )
    const ids = jobs.map((job: any) => job.id)
    const joined = ids.length
      ? await queryRows(
        `SELECT cj.*, mk.keyword
         FROM crawl_jobs cj
         LEFT JOIN monitor_keywords mk ON mk.id = cj.keyword_id
         WHERE cj.id = ANY($1::uuid[])`,
        [ids],
      )
      : []
    return apiResponse({ cycle_at: cycleAt, jobs: joined.map(mapJob) }, 201)
  } catch {}

  const now = new Date().toISOString().slice(0, 16)
  const newJobs = [
    { id: ++_jobId, cycle_at: now, status: "pending", processed_count: 0, monitor_keywords: { keyword: "手机支架" } },
    { id: ++_jobId, cycle_at: now, status: "pending", processed_count: 0, monitor_keywords: { keyword: "露营灯" } },
  ]
  _jobs.unshift(...newJobs)
  return apiResponse({ cycle_at: now, jobs: newJobs, mock: true }, 201)
}
