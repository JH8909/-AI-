"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Loader2, TrendingUp, DollarSign, Shield, Users } from "lucide-react"

const dimensionLabels: Record<string, string> = {
  market_demand: "市场需求度", profit_margin: "利润空间",
  competition_intensity: "竞争激烈度", compliance_risk: "合规风险", content_fit: "内容适配度"
}
const dimensionIcons: Record<string, any> = {
  market_demand: TrendingUp, profit_margin: DollarSign,
  competition_intensity: Users, compliance_risk: Shield, content_fit: Star
}

export default function AIScoringPage() {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [selected, setSelected] = useState("")
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/scores").then(r => r.json()),
      fetch("/api/products").then(r => r.json()),
    ]).then(([d, p]) => {
      if (d.success) setScores(d.data)
      if (p.success) {
        setProducts(p.data)
        if (p.data.length > 0) setSelected(p.data[0].id)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleScore = async () => {
    setScoring(true)
    try {
      const product = products.find(p => p.id === selected) || products[0]
      const r = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product })
      })
      const d = await r.json()
      if (d.success) setScores(prev => [{ ...d.data, productName: d.data.productName || product?.name || `产品 #${Date.now()}`, created_at: d.data.created_at || new Date().toISOString().split("T")[0] }, ...prev])
    } catch {}
    setScoring(false)
  }

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) return score <= 3 ? "text-green-600" : score <= 6 ? "text-yellow-600" : "text-red-600"
    return score >= 8 ? "text-green-600" : score >= 6 ? "text-yellow-600" : "text-red-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">AI 评分</h1><p className="text-sm text-muted-foreground mt-1">多维度AI产品评分</p></div>
        <div className="flex gap-2">
          <select className="flex h-10 w-56 rounded-md border border-input bg-background px-3 text-sm" value={selected} onChange={e => setSelected(e.target.value)}>
            {products.length === 0 ? <option value="">暂无产品</option> : products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button onClick={handleScore} disabled={scoring || products.length === 0}>
            {scoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}
            {scoring ? "评分中..." : "重新评分"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
      ) : scores.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Star className="h-8 w-8 mx-auto mb-2" />暂无评分数据</CardContent></Card>
      ) : scores.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-lg">{item.productName}</CardTitle><CardDescription>{item.model_used || "mock"} · {item.created_at}</CardDescription></div>
              <div className="text-right"><p className="text-3xl font-bold text-primary">{item.overall_score}</p><p className="text-xs text-muted-foreground">综合推荐指数</p></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(dimensionLabels).map(([key, label]) => {
                const val = item[key] || 0
                const inverse = key === "competition_intensity" || key === "compliance_risk"
                const Icon = dimensionIcons[key] || Star
                return (
                  <div key={key} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{label}</span></div>
                    <p className={`text-2xl font-bold ${getScoreColor(val, inverse)}`}>{val}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div className={`h-full rounded-full ${inverse ? (val <= 3 ? "bg-green-500" : val <= 6 ? "bg-yellow-500" : "bg-red-500") : (val >= 8 ? "bg-green-500" : val >= 6 ? "bg-yellow-500" : "bg-red-500")}`} style={{ width: `${val * 10}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium mb-2">AI 分析理由</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{typeof item.reasoning === "string" ? item.reasoning : typeof item.overall_reasoning === "string" ? item.overall_reasoning : typeof item === "string" ? item : JSON.stringify(item.reasoning || item.overall_reasoning || "无分析理由")}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
