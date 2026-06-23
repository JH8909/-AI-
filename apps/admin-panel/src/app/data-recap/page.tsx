"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Calendar, Download, Loader2 } from "lucide-react"

export default function DataRecapPage() {
  const [selected, setSelected] = useState("1")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/data-recap?product_id=${selected}`).then(r => r.json()).then(d => {
      if (d.success) setData(d.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selected])

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return { value: "100", up: true }
    return { value: Math.abs(((curr - prev) / prev) * 100).toFixed(1), up: curr >= prev }
  }

  const snapshots = data?.snapshots || []
  const firstDay = snapshots[0] || {}
  const lastDay = snapshots[snapshots.length - 1] || {}

  const metrics = [
    { label: "浏览量", curr: lastDay.views || 0, prev: firstDay.views || 0 },
    { label: "点赞", curr: lastDay.likes || 0, prev: firstDay.likes || 0 },
    { label: "分享", curr: lastDay.shares || 0, prev: firstDay.shares || 0 },
    { label: "销量", curr: lastDay.sales || lastDay.sales_estimate || 0, prev: firstDay.sales || firstDay.sales_estimate || 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">7天复盘</h1><p className="text-sm text-muted-foreground mt-1">产品数据追踪与AI复盘报告</p></div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />导出报告</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <label className="text-sm font-medium">复盘产品：</label>
          <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="1">极简风桌面手机支架</option><option value="2">无线蓝牙降噪耳机Pro</option>
          </select>
          {data?.period && <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4" />{data.period}</span>}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {metrics.map((m) => {
              const change = calcChange(m.curr, m.prev)
              return (
                <Card key={m.label}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <p className="text-2xl font-bold">{m.curr}</p>
                      <div className={`flex items-center text-sm ${change.up ? "text-green-600" : "text-red-600"}`}>
                        {change.up ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        {change.value}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">每日数据明细</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                    <th className="p-3 font-medium">日期</th><th className="p-3 font-medium">浏览</th>
                    <th className="p-3 font-medium">点赞</th><th className="p-3 font-medium">分享</th><th className="p-3 font-medium">预估销量</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{s.date || s.snapshot_date}</td>
                      <td className="p-3">{s.views || 0}</td>
                      <td className="p-3">{s.likes || 0}</td>
                      <td className="p-3">{s.shares || 0}</td>
                      <td className="p-3">{s.sales || s.sales_estimate || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><CardTitle className="text-base">AI 复盘报告</CardTitle><Badge variant="secondary">自动生成</Badge></div>
              <CardDescription>基于7天数据自动生成的分析报告</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{data?.aiSummary || "暂无数据"}</div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
