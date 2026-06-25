"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Wand2, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

const platformLabels: Record<string, string> = { xiaohongshu: "小红书", xianyu: "闲鱼" }
const statusLabels: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已驳回", revised: "已修改", scheduled: "已排期" }
const statusVariants: Record<string, "warning" | "success" | "destructive" | "secondary"> = { pending: "warning", approved: "success", rejected: "destructive", revised: "secondary", scheduled: "secondary" }

export default function ContentDraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [platform, setPlatform] = useState("xiaohongshu")
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const params = filter !== "all" ? `?platform=${filter}` : ""
    Promise.all([
      fetch(`/api/content-drafts${params}`).then(r => r.json()),
      fetch("/api/products").then(r => r.json()),
    ]).then(([d, p]) => {
      if (d.success) setDrafts(d.data)
      if (p.success) {
        setProducts(p.data)
        if (p.data.length > 0 && !selectedProduct) setSelectedProduct(p.data[0].id)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filter, selectedProduct])

  const handleGenerate = async () => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return
    setGenerating(true)
    setMessage(null)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, platform }),
      })
      const result = await res.json()
      if (!result.success) {
        setMessage({ type: "error", text: result.error || "内容生成失败" })
      } else {
        const asset = result.data || {}
        const platformContent = platform === "xianyu" ? asset.xianyu : asset.xiaohongshu
        const createRes = await fetch("/api/content-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            productName: product.name,
            platform,
            title: platformContent?.title || product.name,
            body: platformContent?.body || "",
            hashtags: platformContent?.hashtags || [],
            price_suggestion: platformContent?.price_suggestion ?? null,
            image_prompt: asset.image_prompt || null,
          }),
        })
        const created = await createRes.json()
        if (!created.success) {
          setMessage({ type: "error", text: created.error || "内容保存失败" })
          setGenerating(false)
          return
        }
        setMessage({ type: "success", text: "内容已生成并进入审核队列" })
        setDrafts(prev => [created.data, ...prev])
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "内容生成失败" })
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">内容草稿</h1><p className="text-sm text-muted-foreground mt-1">AI生成的小红书/闲鱼文案</p></div>
        <div className="flex gap-2">
          <select className="flex h-10 w-48 rounded-md border border-input bg-background px-3 text-sm" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            {products.length === 0 ? <option value="">暂无产品</option> : products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="flex h-10 w-28 rounded-md border border-input bg-background px-3 text-sm" value={platform} onChange={e => setPlatform(e.target.value)}>
            <option value="xiaohongshu">小红书</option>
            <option value="xianyu">闲鱼</option>
          </select>
          <Button onClick={handleGenerate} disabled={generating || products.length === 0}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {generating ? "生成中..." : "生成内容"}
          </Button>
        </div>
      </div>
      {message && <div className={`rounded-md border p-3 text-sm ${message.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}
      <div className="flex gap-2">
        {[{ value: "all", label: "全部" }, { value: "xiaohongshu", label: "小红书" }, { value: "xianyu", label: "闲鱼" }].map(tab => (
          <Button key={tab.value} variant={filter === tab.value ? "default" : "outline"} size="sm" onClick={() => setFilter(tab.value)}>{tab.label}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
      ) : (
        <div className="grid gap-4">
          {drafts.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><FileText className="h-8 w-8" /><p>暂无内容草稿</p></CardContent></Card>
          ) : drafts.map((draft) => (
            <Card key={draft.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{platformLabels[draft.platform] || draft.platform}</Badge>
                    <Badge variant={statusVariants[draft.status] || "secondary"}>{statusLabels[draft.status] || draft.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(draft.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">产品：{draft.productName}</p>
                <h3 className="font-semibold mb-2">{draft.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">{draft.body}</p>
                {draft.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">{draft.hashtags.map((tag: string, i: number) => <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{tag}</span>)}</div>
                )}
                {draft.priceSuggestion && <p className="text-sm text-muted-foreground mb-3">建议价格：<span className="font-bold text-foreground">¥{draft.priceSuggestion.toFixed(2)}</span></p>}
              {(() => {
                const ip = draft.image_prompt
                if (!ip) return null
                const promptText = typeof ip === "string" ? ip : (ip.cn || ip.en || JSON.stringify(ip))
                const promptCn = typeof ip === "object" ? ip.cn : ""
                const promptEn = typeof ip === "object" ? ip.en : ""
                return <div className="rounded-md bg-muted/30 p-3 mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">图片 Prompt</p>
                  {promptCn && <p className="text-sm text-muted-foreground mb-1">{promptCn}</p>}
                  {promptEn && <p className="text-sm text-muted-foreground">{promptEn}</p>}
                  <button onClick={() => { navigator.clipboard.writeText(promptText); alert("已复制") }} className="text-xs text-blue-600 mt-1 underline">复制</button>
                </div>
              })()}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">查看详情</Button>
                  {draft.status === "pending" && <Button size="sm">提交审核</Button>}
                  {draft.status === "approved" && <span className="inline-flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600" disabled>已通过</Button>
                      <Button size="sm" variant="default" onClick={() => {
                        const dt = prompt("输入排期时间 (格式: YYYY-MM-DD HH:mm):")
                        if (dt && dt.length >= 10) {
                          fetch("/api/content-drafts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: draft.id, status: "scheduled", scheduled_at: dt })
                          }).then(r => r.json()).then(d => {
                            if (d.success) { alert("已排期: " + dt); window.location.reload() }
                            else alert("失败: " + (d.error || "?"))
                          }).catch(() => alert("请求失败"))
                        }
                      }}>
                        排期发布
                      </Button>
                    </span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
