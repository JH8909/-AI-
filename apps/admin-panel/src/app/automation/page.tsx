"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, CheckCircle, Clock3, Loader2, Play, RefreshCw, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/toast-provider"
import { formatDate } from "@/lib/utils"

type AutomationRun = {
  id: string
  trigger: string
  status: "running" | "succeeded" | "failed"
  result?: Record<string, unknown>
  error?: string | null
  started_at?: string
}

type RunResult = {
  runId?: string | null
  collectedCount?: number
  createdCount?: number
  verifiedCount?: number
  scoredCount?: number
  promotedCount?: number
  draftedCount?: number
}

const statusLabels: Record<AutomationRun["status"], string> = {
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
}

const statusIcons = {
  running: Clock3,
  succeeded: CheckCircle,
  failed: XCircle,
}

function countFrom(run: AutomationRun, key: keyof RunResult) {
  const value = run.result?.[key]
  return typeof value === "number" ? value : 0
}

export default function AutomationPage() {
  const { toast } = useToast()
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [lastResult, setLastResult] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [token, setToken] = useState("")
  const [collectLimit, setCollectLimit] = useState("8")
  const [maxPromotions, setMaxPromotions] = useState("2")
  const [promoteThreshold, setPromoteThreshold] = useState("65")
  const [includeCurated, setIncludeCurated] = useState(true)

  useEffect(() => {
    setToken(sessionStorage.getItem("automationToken") || "")
    loadRuns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const latestRun = runs[0]
  const summary = useMemo(() => ({
    succeeded: runs.filter((run) => run.status === "succeeded").length,
    failed: runs.filter((run) => run.status === "failed").length,
    promoted: runs.reduce((sum, run) => sum + countFrom(run, "promotedCount"), 0),
    drafted: runs.reduce((sum, run) => sum + countFrom(run, "draftedCount"), 0),
  }), [runs])

  async function loadRuns() {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      const savedToken = sessionStorage.getItem("automationToken") || token
      if (savedToken) headers["x-automation-token"] = savedToken
      const res = await fetch("/api/automation/run?history=1&limit=20", { headers })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "加载自动化运行记录失败")
      setRuns(data.data || [])
    } catch (err: any) {
      toast("error", err.message || "加载自动化运行记录失败")
    }
    setLoading(false)
  }

  async function runNow() {
    setRunning(true)
    setLastResult(null)
    try {
      if (token.trim()) sessionStorage.setItem("automationToken", token.trim())
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token.trim()) headers["x-automation-token"] = token.trim()
      const res = await fetch("/api/automation/run", {
        method: "POST",
        headers,
        body: JSON.stringify({
          trigger: "operator",
          collectLimit,
          maxPromotions,
          promoteThreshold,
          includeCurated,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        if (res.status === 401) throw new Error("需要填写服务器 AUTOMATION_TOKEN 后再手动触发")
        throw new Error(data.error || "自动化运行失败")
      }
      setLastResult(data.data)
      toast("success", "自动化任务已运行")
      await loadRuns()
    } catch (err: any) {
      toast("error", err.message || "自动化运行失败")
    }
    setRunning(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">自动化任务</h1>
          <p className="text-sm text-muted-foreground mt-1">定时采集趋势线索，验证供货，评分，入产品池，并生成待审核内容。</p>
        </div>
        <Button variant="outline" onClick={loadRuns} disabled={loading || running}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          刷新记录
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>最近状态</CardDescription><CardTitle className="text-lg">{latestRun ? statusLabels[latestRun.status] : "暂无记录"}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>成功运行</CardDescription><CardTitle>{summary.succeeded}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>失败运行</CardDescription><CardTitle>{summary.failed}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>生成草稿</CardDescription><CardTitle>{summary.drafted}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> 手动运行</CardTitle>
          <CardDescription>用于立即验证闭环；定时任务仍由服务器 cron 每 6 小时触发。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">采集数量</label>
              <Input value={collectLimit} onChange={(e) => setCollectLimit(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">最多入池</label>
              <Input value={maxPromotions} onChange={(e) => setMaxPromotions(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">入池分数线</label>
              <Input value={promoteThreshold} onChange={(e) => setPromoteThreshold(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">自动化 Token</label>
              <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="服务器已配置时需要" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeCurated} onChange={(e) => setIncludeCurated(e.target.checked)} />
            同时包含内置验证样例
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runNow} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              立即运行
            </Button>
            {lastResult && (
              <div className="text-sm text-muted-foreground">
                本次：采集 {lastResult.collectedCount || 0}，候选 {lastResult.createdCount || 0}，验证 {lastResult.verifiedCount || 0}，评分 {lastResult.scoredCount || 0}，入池 {lastResult.promotedCount || 0}，草稿 {lastResult.draftedCount || 0}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近运行</CardTitle>
          <CardDescription>服务器启用 PostgreSQL 后会记录每次 cron 或手动运行。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium">触发</th>
                  <th className="p-4 font-medium">开始时间</th>
                  <th className="p-4 font-medium">结果</th>
                  <th className="p-4 font-medium">错误</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const Icon = statusIcons[run.status] || Clock3
                  return (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="p-4">
                        <Badge variant={run.status === "succeeded" ? "success" : run.status === "failed" ? "destructive" : "secondary"}>
                          <Icon className="mr-1 h-3 w-3" /> {statusLabels[run.status] || run.status}
                        </Badge>
                      </td>
                      <td className="p-4">{run.trigger}</td>
                      <td className="p-4">{run.started_at ? formatDate(run.started_at) : "-"}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        采集 {countFrom(run, "collectedCount")} / 候选 {countFrom(run, "createdCount")} / 入池 {countFrom(run, "promotedCount")} / 草稿 {countFrom(run, "draftedCount")}
                      </td>
                      <td className="max-w-xs truncate p-4 text-xs text-red-600">{run.error || "-"}</td>
                    </tr>
                  )
                })}
                {!runs.length && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      暂无运行记录。本地无 PostgreSQL 时不会持久化历史，但手动运行仍可验证流程返回。
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
