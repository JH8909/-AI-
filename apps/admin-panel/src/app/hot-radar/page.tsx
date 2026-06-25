"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/toast-provider"

type RadarRow = {
  id: string
  rank: number
  name: string
  platform: string
  sourceUrl: string | null
  overall_score: number
  confidence: "low" | "medium" | "high"
  supplyStatus: string
  recommendedAction: string
  keywords: string[]
}

const supplyLabels: Record<string, string> = {
  matched: "供货已验证",
  partial_match: "部分匹配",
  not_found: "未找到货源",
  blocked: "访问受限",
  needs_manual_review: "需人工复核",
}

const actionLabels: Record<string, string> = {
  observe: "继续观察",
  verify_supply: "验证供货",
  test_listing: "测试上架",
  scale: "放量",
  reject: "淘汰",
}

export default function HotRadarPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<RadarRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/hot-radar/rankings")
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "加载爆品雷达失败")
      setRows(data.data.rows || [])
    } catch (err: any) {
      toast("error", err.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const promote = async (row: RadarRow) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trend-candidates/${row.id}/promote-to-product`, { method: "POST" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "加入产品池失败")
      await load()
      toast("success", "已加入产品池")
    } catch (err: any) {
      toast("error", err.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">爆品雷达</h1>
          <p className="text-sm text-muted-foreground mt-1">全网趋势、1688 供货、利润风险和内容适配的综合评分。</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          刷新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已评分候选</CardDescription>
            <CardTitle>{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>可测试上架</CardDescription>
            <CardTitle>{rows.filter((row) => row.recommendedAction === "test_listing" || row.recommendedAction === "scale").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>供货已验证</CardDescription>
            <CardTitle>{rows.filter((row) => row.supplyStatus === "matched").length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>综合榜单</CardTitle>
          <CardDescription>只有经过评分的趋势候选会进入这里；加入产品池仍需要人工点击确认。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">排名</th>
                  <th className="p-4 font-medium">商品</th>
                  <th className="p-4 font-medium">来源</th>
                  <th className="p-4 font-medium">供货</th>
                  <th className="p-4 font-medium">评分</th>
                  <th className="p-4 font-medium">建议动作</th>
                  <th className="p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-4 font-semibold">#{row.rank}</td>
                    <td className="p-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.keywords?.join(" / ") || "无关键词"}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{row.platform}</Badge>
                      {row.sourceUrl && <a className="block pt-1 text-xs text-primary" href={row.sourceUrl} target="_blank">来源证据</a>}
                    </td>
                    <td className="p-4">
                      <Badge variant={row.supplyStatus === "matched" ? "success" : "warning"}>
                        {supplyLabels[row.supplyStatus] || row.supplyStatus}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{row.overall_score.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">置信度 {row.confidence}</div>
                    </td>
                    <td className="p-4">{actionLabels[row.recommendedAction] || row.recommendedAction}</td>
                    <td className="p-4">
                      <Button size="sm" onClick={() => promote(row)} disabled={loading || row.supplyStatus !== "matched"}>加入产品池</Button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                      暂无已评分候选。先到趋势候选池添加候选、验证 1688 供货并生成评分。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
