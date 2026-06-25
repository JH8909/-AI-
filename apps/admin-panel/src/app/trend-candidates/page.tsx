"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Search, ShieldCheck, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/toast-provider"

const supplyLabels: Record<string, string> = {
  matched: "已匹配",
  partial_match: "部分匹配",
  not_found: "未找到",
  blocked: "受限",
  needs_manual_review: "需人工复核",
}

const actionLabels: Record<string, string> = {
  observe: "继续观察",
  verify_supply: "验证供货",
  test_listing: "测试上架",
  scale: "放量",
  reject: "淘汰",
}

export default function TrendCandidatesPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [platform, setPlatform] = useState("xiaohongshu")
  const [sourceUrl, setSourceUrl] = useState("")
  const [keywords, setKeywords] = useState("")

  const request = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "请求失败")
    return data.data
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await request("/api/trend-candidates")
      setRows(data.rows || [])
    } catch (err: any) {
      toast("error", err.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createCandidate = async () => {
    if (!title.trim()) return toast("error", "候选商品名称不能为空")
    setLoading(true)
    try {
      await request("/api/trend-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          platform,
          sourceUrl,
          heat: 70,
          growth: 20,
          priceBand: "待验证",
          keywords: keywords.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      })
      setTitle("")
      setSourceUrl("")
      setKeywords("")
      await load()
      toast("success", "趋势候选已添加")
    } catch (err: any) {
      toast("error", err.message)
    }
    setLoading(false)
  }

  const verifySupply = async (row: any) => {
    setLoading(true)
    try {
      const title = window.prompt("1688 供货商品名", row.name)
      if (title === null) return
      const price = window.prompt("1688 拿货价", "12")
      await request(`/api/trend-candidates/${row.id}/verify-supply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://detail.1688.com/offer/123.html",
          title,
          price: price ? Number(price) : null,
          moq: 1,
          supplierName: "人工验证货源",
        }),
      })
      await load()
      toast("success", "供货验证已记录")
    } catch (err: any) {
      toast("error", err.message)
    }
    setLoading(false)
  }

  const score = async (row: any) => {
    setLoading(true)
    try {
      await request(`/api/trend-candidates/${row.id}/score`, { method: "POST" })
      await load()
      toast("success", "评分已生成")
    } catch (err: any) {
      toast("error", err.message)
    }
    setLoading(false)
  }

  const promote = async (row: any) => {
    setLoading(true)
    try {
      await request(`/api/trend-candidates/${row.id}/promote-to-product`, { method: "POST" })
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
          <h1 className="text-2xl font-bold">趋势候选池</h1>
          <p className="text-sm text-muted-foreground mt-1">承接全网爆品线索，先验证供货和评分，再进入产品池。</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增候选</CardTitle>
          <CardDescription>第一阶段先支持手动/CSV/API 写入，自动采集后续接入。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_1.5fr_1fr_auto]">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="商品名，例如桌面理线收纳盒" />
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="xiaohongshu">小红书</option>
              <option value="xianyu">闲鱼</option>
              <option value="douyin">抖音</option>
              <option value="marketplace">电商榜单</option>
              <option value="manual">手动</option>
            </select>
            <Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="来源链接" />
            <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="关键词，逗号分隔" />
            <Button onClick={createCandidate} disabled={loading}><Plus className="mr-2 h-4 w-4" />添加</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>候选商品</CardTitle>
          <CardDescription>候选商品不会直接进入产品池，必须通过供货验证和人工确认。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">候选商品</th>
                  <th className="p-4 font-medium">来源</th>
                  <th className="p-4 font-medium">趋势</th>
                  <th className="p-4 font-medium">供货验证</th>
                  <th className="p-4 font-medium">评分</th>
                  <th className="p-4 font-medium">动作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.keywords?.join(" / ") || "无关键词"}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{row.platform}</Badge>
                    </td>
                    <td className="p-4">
                      <div>热度 {row.heat}</div>
                      <div className="text-xs text-muted-foreground">增长 {row.growth}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={row.supply?.status === "matched" ? "success" : "warning"}>
                        {supplyLabels[row.supply?.status || "not_found"] || "未验证"}
                      </Badge>
                      {row.supply?.reason && <div className="mt-1 text-xs text-muted-foreground">{row.supply.reason}</div>}
                    </td>
                    <td className="p-4">
                      {row.score ? (
                        <div>
                          <div className="font-medium">{row.score.total}</div>
                          <div className="text-xs text-muted-foreground">{actionLabels[row.score.recommendedAction]}</div>
                        </div>
                      ) : "未评分"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => verifySupply(row)} disabled={loading}><ShieldCheck className="mr-1 h-4 w-4" />供货</Button>
                        <Button size="sm" variant="outline" onClick={() => score(row)} disabled={loading}><Star className="mr-1 h-4 w-4" />评分</Button>
                        <Button size="sm" onClick={() => promote(row)} disabled={loading || row.supply?.status !== "matched"}><Search className="mr-1 h-4 w-4" />入池</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
