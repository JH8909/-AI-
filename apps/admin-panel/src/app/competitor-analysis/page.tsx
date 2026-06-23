"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BarChart3, Plus, Loader2, ExternalLink } from "lucide-react"

export default function CompetitorAnalysisPage() {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState("")

  useEffect(() => {
    fetch("/api/competitor-analysis").then(r => r.json()).then(d => {
      if (d.success && d.data.length > 0) setAnalysis(d.data[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const r = await fetch("/api/ai/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: "极简风桌面手机支架",
          productDesc: "铝合金材质折叠便携支架",
          competitors: [{ name: "竞品A", price: 39.9, platform: "淘宝", url: "" }]
        })
      })
      const d = await r.json()
      if (d.success) setAnalysis({ ...d.data, competitors: d.data.competitor_details || [] })
    } catch {}
    setAnalyzing(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>

  const competitors = analysis?.competitors || []
  const toStr = (v: any): string => {
    if (typeof v === 'string') return v
    if (v === null || v === undefined) return "暂无数据"
    try { return JSON.stringify(v, null, 2) } catch { return String(v) }
  }
  const priceComparison = toStr(analysis?.priceComparison || analysis?.price_comparison)
  const differentiation = toStr(analysis?.differentiation)
  const contentStrategy = toStr(analysis?.contentStrategy || analysis?.content_strategy)
  const overallReport = toStr(analysis?.overallReport || analysis?.overall_report)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">竞品分析</h1><p className="text-sm text-muted-foreground mt-1">选择产品并添加竞品链接，生成分析报告</p></div>
        <Button onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
          {analyzing ? "分析中..." : "开始分析"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">目标产品</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>极简风桌面手机支架</option><option>无线蓝牙降噪耳机Pro</option><option>ins风陶瓷咖啡杯套装</option>
              </select>
            </div>
            <div className="flex-[2]">
              <label className="text-sm font-medium mb-1 block">添加竞品链接</label>
              <div className="flex gap-2">
                <Input placeholder="输入竞品商品链接..." value={newUrl} onChange={e => setNewUrl(e.target.value)} />
                <Button variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">价格对比</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {competitors.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">暂无竞品数据</p>}
            {competitors.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.platform}</p></div>
                <div className="text-right">
                  <p className="font-bold text-lg">¥{(c.price || 0).toFixed(2)}</p>
                  <div className="flex gap-1 mt-1">{(c.strengths || []).slice(0, 2).map((s: string, j: number) => <Badge key={j} variant="success" className="text-xs">{s}</Badge>)}</div>
                </div>
              </div>
            ))}
            <Separator /><p className="text-sm text-muted-foreground">{priceComparison}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">差异化分析</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{differentiation}</p>
            <Separator className="my-4" />
            <h4 className="text-sm font-medium mb-2">内容策略建议</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{contentStrategy}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">综合分析报告</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-relaxed">{overallReport}</p></CardContent>
      </Card>
    </div>
  )
}
