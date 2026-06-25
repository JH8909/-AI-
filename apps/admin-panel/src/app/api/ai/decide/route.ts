import { apiResponse } from "@/lib/data/mock-data"

export async function POST(req: Request) {
  const body = await req.json()
  const { product_name, snapshots } = body
  const last = snapshots?.[snapshots?.length - 1] || {}
  const first = snapshots?.[0] || {}
  const viewGrowth = first.views ? ((last.views - first.views) / first.views * 100) : 0
  const engagementRate = last.views ? ((last.likes + last.shares) / last.views * 100) : 0
  const totalSales = (snapshots || []).reduce((s: number, d: any) => s + (d.sales_estimate || 0), 0)

  // Decision logic
  let decision: "magnify" | "optimize" | "eliminate"
  if (viewGrowth > 50 && engagementRate > 10) decision = "magnify"
  else if (viewGrowth < -30 && engagementRate < 3) decision = "eliminate"
  else decision = "optimize"

  const reasons: Record<string, string> = {
    magnify: "曝光增长" + viewGrowth.toFixed(0) + "%，互动率" + engagementRate.toFixed(1) + "%，表现优异",
    optimize: "曝光" + (viewGrowth >= 0 ? "稳定" : "下降" + viewGrowth.toFixed(0) + "%") + "，可优化内容策略",
    eliminate: "曝光下降" + Math.abs(viewGrowth).toFixed(0) + "%，互动率仅" + engagementRate.toFixed(1) + "%",
  }

  return apiResponse({
    decision, reason: reasons[decision],
    view_growth: Math.round(viewGrowth),
    engagement_rate: Math.round(engagementRate * 10) / 10,
    total_sales: totalSales,
    actions: decision === "magnify"
      ? ["加大内容投放量至每日2-3条", "测试抖音/视频号等新平台", "增加变体SKU(颜色/尺寸)", "联系达人合作推广"]
      : decision === "optimize"
      ? ["优化标题和首图提升点击率", "测试不同定价策略", "调整内容风格(视频/图文)", "增加用户评价/晒单内容"]
      : ["清仓现有库存", "停止内容投放", "记录失败原因归档", "评估是否换品类"],
    mock: true,
  })
}
