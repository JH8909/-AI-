import { apiResponse, apiError } from "@/lib/data/mock-data"

let _tasks: any[] = [
  { id: 1, product_id: "1", title: "加大内容投放至每日2条", assignee: "", done: false, created_at: "2026-06-23" },
  { id: 2, product_id: "1", title: "测试抖音平台发布", assignee: "", done: false, created_at: "2026-06-23" },
]

export async function GET(req: Request) {
  const url = new URL(req.url)
  const pid = url.searchParams.get("product_id")
  const tasks = pid ? _tasks.filter(t => t.product_id === pid) : _tasks
  return apiResponse(tasks)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (body.action === "generate" && body.decision) {
    const templates: Record<string, string[]> = {
      magnify: ["加大内容投放至每日2-3条", "测试抖音/视频号新平台", "增加变体SKU", "联系达人推广"],
      optimize: ["优化标题和首图", "测试不同定价", "调整内容风格", "增加用户评价内容"],
      eliminate: ["清仓现有库存", "停止内容投放", "记录失败原因", "评估新品类"],
    }
    const items = (templates[body.decision] || []).map((title: string, i: number) => ({
      id: Date.now() + i, product_id: body.product_id || "", title,
      assignee: "", done: false, created_at: new Date().toISOString().split("T")[0],
    }))
    _tasks.unshift(...items)
    return apiResponse(items, 201)
  }
  if (body.action === "toggle" && body.id) {
    const t = _tasks.find(t => t.id === body.id)
    if (t) t.done = !t.done
    return apiResponse(t || {})
  }
  return apiError("未知操作")
}
