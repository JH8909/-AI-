"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Package, Upload, Plus, Search, Loader2 } from "lucide-react"
import { formatPrice, formatDate, riskLabel } from "@/lib/utils"

const categoryLabels: Record<string, string> = {
  fashion: "服饰", electronics: "电子", home: "家居", beauty: "美妆",
  food: "食品", sports: "运动", toys: "玩具", books: "图书", digital: "数码", other: "其他"
}
const statusLabels: Record<string, string> = { draft: "草稿", active: "已上架", archived: "已归档" }

export default function ProductsPage() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [linkUrl, setLinkUrl] = useState("")
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (categoryFilter !== "all") params.set("category", categoryFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    fetch(`/api/products?${params}`).then(r => r.json()).then(d => {
      if (d.success) setProducts(d.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [search, categoryFilter, statusFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleImportLink = async () => {
    setImporting(true)
    setImportMessage(null)
    try {
      const res = await fetch("/api/products/import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl }),
      })
      const result = await res.json()
      if (!result.success) {
        setImportMessage({ type: "error", text: result.error || "链接导入失败" })
      } else {
        setLinkUrl("")
        setImportMessage({ type: "success", text: "已导入：" + result.data.name })
        fetchProducts()
      }
    } catch (err: any) {
      setImportMessage({ type: "error", text: err.message || "链接导入失败" })
    }
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">产品池</h1>
          <p className="text-sm text-muted-foreground mt-1">管理所有产品数据</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />CSV导入</Button>
          <Button><Plus className="h-4 w-4 mr-2" />添加产品</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex gap-3">
            <Input
              placeholder="粘贴 1688 商品链接，例如 https://detail.1688.com/offer/xxx.html"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
            <Button onClick={handleImportLink} disabled={importing || !linkUrl.trim()}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              链接导入
            </Button>
          </div>
          {importMessage && (
            <div className={`mb-4 rounded-md border p-3 text-sm ${importMessage.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {importMessage.text}
            </div>
          )}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索产品名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="flex h-10 w-32 rounded-md border border-input bg-background px-3 text-sm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">全部分类</option>{Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="flex h-10 w-32 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">全部状态</option>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">产品名称</th>
                  <th className="p-4 font-medium">品类</th>
                  <th className="p-4 font-medium">价格</th>
                  <th className="p-4 font-medium">成本</th>
                  <th className="p-4 font-medium">来源</th>
                  <th className="p-4 font-medium">风险</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium">日期</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2" />没有找到匹配的产品</td></tr>
                ) : products.map((p) => {
                  const risk = riskLabel(p.risk_level)
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">{p.name}</td>
                      <td className="p-4">{categoryLabels[p.category] || p.category}</td>
                      <td className="p-4">{formatPrice(p.price)}</td>
                      <td className="p-4">{formatPrice(p.cost)}</td>
                      <td className="p-4 text-xs text-muted-foreground">{p.source}</td>
                      <td className="p-4"><Badge variant={p.risk_level === "safe" ? "success" : p.risk_level === "warning" ? "warning" : "destructive"}>{risk.label}</Badge></td>
                      <td className="p-4"><Badge variant={p.status === "active" ? "success" : "secondary"}>{statusLabels[p.status]}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(p.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
