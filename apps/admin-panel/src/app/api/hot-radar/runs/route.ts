import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSupabaseClient } from "@/lib/supabase"

// In-memory job store for demo mode
let _jobId = 10
const _jobs: any[] = [
  { id: 1, cycle_at: new Date(Date.now() - 86400000).toISOString().slice(0, 16), status: "completed", processed_count: 12, monitor_keywords: { keyword: "手机支架" } },
  { id: 2, cycle_at: new Date(Date.now() - 43200000).toISOString().slice(0, 16), status: "completed", processed_count: 8, monitor_keywords: { keyword: "露营灯" } },
  { id: 3, cycle_at: new Date(Date.now() - 21600000).toISOString().slice(0, 16), status: "running", processed_count: 5, monitor_keywords: { keyword: "桌面收纳" } },
]

export async function GET() {
  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data: jobs, error: je } = await supabase.from("crawl_jobs").select("*, monitor_keywords(keyword)").order("created_at", { ascending: false }).limit(20)
      if (!je) {
        const { count } = await supabase.from("monitor_keywords").select("*", { count: "exact", head: true }).eq("enabled", true)
        return apiResponse({ enabledKeywordCount: count || 0, recentJobs: jobs || [] })
      }
    }
  } catch {}
  // Mock fallback
  return apiResponse({ enabledKeywordCount: 3, recentJobs: _jobs, mock: true })
}

export async function POST() {
  try {
    const supabase = await getSupabaseClient()
    if (supabase) {
      const { data: keywords, error: ke } = await supabase.from("monitor_keywords").select("id,keyword").eq("kind", "seed").eq("enabled", true)
      if (!ke && keywords?.length) {
        const cycle_at = new Date().toISOString().slice(0, 16)
        const rows = keywords.map(k => ({ keyword_id: k.id, cycle_at, status: "pending", retry_count: 0 }))
        const { data, error } = await supabase.from("crawl_jobs").upsert(rows, { onConflict: "keyword_id,cycle_at" }).select("*,monitor_keywords(keyword)")
        if (!error) return apiResponse({ cycle_at, jobs: data || [] }, 201)
      }
    }
  } catch {}

  // Mock fallback
  const now = new Date().toISOString().slice(0, 16)
  const newJobs = [
    { id: ++_jobId, cycle_at: now, status: "pending", processed_count: 0, monitor_keywords: { keyword: "手机支架" } },
    { id: ++_jobId, cycle_at: now, status: "pending", processed_count: 0, monitor_keywords: { keyword: "露营灯" } },
  ]
  _jobs.unshift(...newJobs)
  return apiResponse({ cycle_at: now, jobs: newJobs, mock: true }, 201)
}
