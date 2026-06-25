"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Calendar, Download, Loader2, Plus, ChevronRight } from "lucide-react"
import { useToast } from "@/components/toast-provider"

export default function DataRecapPage() {
  const { toast } = useToast()
  const [selected, setSelected] = useState("1")
  const [data, setData] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [decision, setDecision] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingDecision, setLoadingDecision] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/data-recap?product_id=" + selected).then(r => r.json()).then(d => {
      if (d.success) setData(d.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selected])

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return { value: "100", up: true }
    const pct = ((curr - prev) / prev) * 100
    return { value: Math.abs(pct).toFixed(1), up: curr >= prev }
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
            {metrics.map(m => {
              const change = calcChange(m.curr, m.prev)
              return (
                <Card key={m.label}>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <div className="flex items-end justify-between mt-1">
                      <p className="text-2xl font-bold">{m.curr}</p>
                      <div className={"flex items-center text-sm " + (change.up ? "text-green-600" : "text-red-600")}>
                        {change.up ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}{change.value}%
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
                <thead><tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                  <th className="p-3 font-medium">日期</th><th className="p-3 font-medium">浏览</th><th className="p-3 font-medium">点赞</th><th className="p-3 font-medium">分享</th><th className="p-3 font-medium">预估销量</th>
                </tr></thead>
                <tbody>
                  {snapshots.map((s: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{s.date || s.snapshot_date}</td>
                      <td className="p-3">{s.views || 0}</td><td className="p-3">{s.likes || 0}</td>
                      <td className="p-3">{s.shares || 0}</td><td className="p-3">{s.sales || s.sales_estimate || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* AI Report Section */}
          {report && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><CardTitle className="text-base">AI 复盘分析</CardTitle><Badge variant="secondary">{report.model_used === "mock" ? "Mock" : "AI"}</Badge></div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3"><p className="font-medium text-blue-800">{report.summary || "暂无"}</p></div>
                {report.exposure_analysis && <div><h4 className="font-medium mb-1">曝光分析</h4><p className="text-muted-foreground">{report.exposure_analysis}</p></div>}
                {report.engagement_analysis && <div><h4 className="font-medium mb-1">互动评估</h4><p className="text-muted-foreground">{report.engagement_analysis}</p></div>}
                {report.conversion_analysis && <div><h4 className="font-medium mb-1">转化分析</h4><p className="text-muted-foreground">{report.conversion_analysis}</p></div>}
                {report.risk_warning && <div><h4 className="font-medium mb-1">风险提示</h4><p className="text-yellow-700">{report.risk_warning}</p></div>}
                {report.suggestion && <div><h4 className="font-medium mb-1">优化建议</h4><p className="text-muted-foreground">{report.suggestion}</p></div>}
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={async () => {
              setLoadingReport(true)
              const r = await fetch("/api/ai/recap", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ product_name: selected === "1" ? "极简风桌面手机支架" : "无线蓝牙降噪耳机Pro", snapshots }) })
              const d = await r.json()
              if (d.success) { setReport(d.data); toast("success", "AI报告已生成") } else toast("error", d.error || "生成失败")
              setLoadingReport(false)
            }} disabled={loadingReport} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}生成AI复盘报告
            </button>
            <button onClick={async () => {
              setLoadingDecision(true)
              const r = await fetch("/api/ai/decide", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ product_name: selected === "1" ? "极简风桌面手机支架" : "无线蓝牙降噪耳机Pro", snapshots }) })
              const d = await r.json()
              if (d.success) { setDecision(d.data); toast("success", "决策建议已生成") } else toast("error", d.error || "生成失败")
              setLoadingDecision(false)
            }} disabled={loadingDecision} className="px-4 py-2 text-sm rounded-md border hover:bg-muted disabled:opacity-50 flex items-center gap-2">
              {loadingDecision ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}生成决策建议
            </button>
          </div>

          {/* Decision card */}
          {decision && (
            <Card className={decision.decision === "magnify" ? "border-green-300" : decision.decision === "eliminate" ? "border-red-300" : "border-yellow-300"}>
              <CardHeader><CardTitle className="text-base">建议: {decision.decision === "magnify" ? "放大投入" : decision.decision === "optimize" ? "优化调整" : "淘汰下架"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">曝光变化</p><p className={"text-lg font-bold " + (decision.view_growth >= 0 ? "text-green-600" : "text-red-600")}>{decision.view_growth >= 0 ? "+" : ""}{decision.view_growth}%</p></div>
                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">互动率</p><p className="text-lg font-bold">{decision.engagement_rate}%</p></div>
                  <div className="rounded-lg border p-3"><p className="text-muted-foreground">总销量</p><p className="text-lg font-bold">{decision.total_sales}</p></div>
                </div>
                <p className="text-sm text-muted-foreground">{decision.reason}</p>
                <div><h4 className="text-sm font-medium mb-2">行动方案</h4>
                  <ul className="space-y-1">{(decision.actions || []).map((a: string, i: number) => <li key={i} className="text-sm text-muted-foreground flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{a}</li>)}</ul>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    await fetch("/api/products/" + selected, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status: decision.decision === "magnify" ? "scale" : decision.decision === "eliminate" ? "rejected" : "optimize" }) })
                    toast("success", "产品状态已更新")
                  }} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">应用决策</button>
                  <button onClick={async () => {
                    const r = await fetch("/api/tasks", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "generate", decision: decision.decision, product_id: selected }) })
                    const d = await r.json()
                    if (d.success) { setTasks((prev: any) => [...d.data, ...prev]); toast("success", "任务已生成") }
                  }} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">生成任务</button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">执行任务 ({tasks.filter((t: any) => !t.done).length}项待完成)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tasks.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <input type="checkbox" checked={t.done} onChange={async () => {
                      await fetch("/api/tasks", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "toggle", id: t.id }) })
                      setTasks((prev: any) => prev.map((x: any) => x.id === t.id ? {...x, done: !x.done} : x))
                    }} className="h-4 w-4" />
                    <span className={"text-sm flex-1 " + (t.done ? "line-through text-muted-foreground" : "")}>{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.created_at}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
