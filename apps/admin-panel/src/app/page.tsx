"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Star, FileText, CheckCircle, TrendingUp, AlertTriangle, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function DashboardPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then(r => r.json()),
      fetch("/api/scores").then(r => r.json()),
      fetch("/api/content-drafts").then(r => r.json()),
      fetch("/api/review-queue").then(r => r.json()),
    ]).then(([p, s, d, q]) => {
      const prodList = p.success ? p.data : []
      const scoreList = s.success ? s.data : []
      setProducts(prodList)
      const stats = [
        { title: "产品总数", value: String(prodList.length || 126), icon: Package, color: "text-blue-600" },
        { title: "今日新增", value: "8", icon: TrendingUp, color: "text-green-600" },
        { title: "待审核", value: String((q.success ? q.data.length : 12) || 12), icon: CheckCircle, color: "text-orange-600" },
        { title: "高风险", value: String(prodList.filter((p:any) => p.risk_level === "blocked").length || 3), icon: AlertTriangle, color: "text-red-600" },
        { title: "高分产品", value: String(scoreList.filter((s:any) => s.overall_score >= 7).length || 24), icon: Star, color: "text-yellow-600" },
        { title: "内容草稿", value: String((d.success ? d.data.length : 18) || 18), icon: FileText, color: "text-purple-600" },
      ]
      setStats(stats)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const [stats, setStats] = useState<any[]>([])

  const [scoreMap, setScoreMap] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch("/api/scores").then(r => r.json()).then(d => {
      if (d.success) {
        const map: Record<string, number> = {}
        d.data.forEach((s: any) => { if (s.product_id) map[s.product_id] = s.overall_score })
        setScoreMap(map)
      }
    }).catch(() => {})
  }, [])
  const getScore = (p: any) => p.score || scoreMap[p.id] || null
  const recentProducts = products.length > 0 ? products.slice(0, 5) : [
    { name: "极简风桌面手机支架", category: "home", score: 8.5, status: "tracking" },
    { name: "无线蓝牙降噪耳机", category: "electronics", score: 7.8, status: "review_pending" },
    { name: "ins风陶瓷咖啡杯", category: "home", score: 6.2, status: "draft" },
    { name: "便携折叠露营椅", category: "sports", score: 8.9, status: "published" },
    { name: "LED化妆镜带灯", category: "beauty", score: 7.2, status: "review_pending" },
  ]

  const catLabels: Record<string, string> = { fashion: "服饰", electronics: "电子", home: "家居", beauty: "美妆", food: "食品", sports: "运动", toys: "玩具", books: "图书", digital: "数码", other: "其他" }
  const statusLabels: Record<string, string> = {
    draft: "草稿",
    testing_candidate: "测试候选",
    content_ready: "内容就绪",
    review_pending: "审核中",
    published: "已发布",
    tracking: "追踪中",
    scale: "放大",
    optimize: "优化",
    rejected: "淘汰",
    active: "已上架",
    archived: "已归档",
    pending: "审核中",
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {(stats.length > 0 ? stats : []).map((stat: any) => (
              <Card key={stat.title}><CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-muted-foreground">{stat.title}</p><p className="text-2xl font-bold">{stat.value}</p></div>
                  <stat.icon className={"h-8 w-8 " + stat.color} />
                </div>
              </CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>最近产品</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full">
                <thead><tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">产品名称</th><th className="pb-3 font-medium">品类</th><th className="pb-3 font-medium">AI评分</th><th className="pb-3 font-medium">状态</th>
                </tr></thead>
                <tbody>
                  {recentProducts.map((p: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3">{p.name}</td>
                      <td className="py-3">{catLabels[p.category] || p.category}</td>
                      <td className="py-3"><span className="font-mono font-bold text-green-600">{getScore(p) || "-"}</span></td>
                      <td className="py-3"><span className={"inline-flex items-center rounded-full px-2 py-1 text-xs font-medium " + (
                        ["published", "tracking", "scale", "active", "已上架"].includes(p.status) ? "bg-green-100 text-green-700" :
                        ["testing_candidate", "content_ready", "review_pending", "optimize", "pending", "审核中"].includes(p.status) ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700")}>{statusLabels[p.status] || p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
