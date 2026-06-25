import { apiResponse, apiError } from "@/lib/data/mock-data"
import { queryRows } from "@/lib/postgres"
import { boundedStringList, readJson } from "../api-utils"

export async function GET() {
  try {
    const data = await queryRows(
      "SELECT * FROM monitor_keywords ORDER BY kind DESC, created_at ASC",
    )
    return apiResponse(data)
  } catch (err: any) {
    return apiResponse({ keywords: [], mock: true, note: err.message || "服务器数据库未配置或雷达表未创建" })
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req)
    const keywords = boundedStringList(body.keywords || body.seeds, 10)
    if (!keywords.length) return apiError("请至少提供 1 个监控关键词", 400)

    if (keywords.length) {
      await queryRows(
        "UPDATE monitor_keywords SET enabled = false WHERE kind = 'seed' AND NOT (keyword = ANY($1::text[]))",
        [keywords],
      )
    }

    const rows = await queryRows(
      `INSERT INTO monitor_keywords (keyword, kind, enabled, consecutive_failures)
       SELECT keyword, 'seed', true, 0
       FROM unnest($1::text[]) AS keyword
       ON CONFLICT (keyword) DO UPDATE SET kind = 'seed', enabled = true
       RETURNING *`,
      [keywords],
    )
    return apiResponse(rows)
  } catch (err: any) {
    return apiResponse({ saved: false, mock: true, note: err.message || "服务器数据库未配置或雷达表未创建" })
  }
}
