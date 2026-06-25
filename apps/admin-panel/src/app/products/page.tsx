"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, Package, Upload, Plus, Search, Loader2, BarChart3 } from "lucide-react"
import { formatPrice, formatDate, riskLabel } from "@/lib/utils"
import AddProductModal from "@/components/add-product-modal"
import CsvImportModal from "@/components/csv-import-modal"
import ReleaseDataModal from "@/components/release-data-modal"
import DailyMetricsModal from "@/components/daily-metrics-modal"
import { useToast } from "@/components/toast-provider"

const catLabels: Record<string, string> = {
  fashion: "服饰", electronics: "电子", home: "家居", beauty: "美妆",
  food: "食品", sports: "运动", toys: "玩具", books: "图书", digital: "数码", other: "其他"
}
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
}

export default function ProductsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [showRelease, setShowRelease] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<any>(null)

  const fetchProducts = () => {
    setLoading(true)
    setError("")
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (catFilter !== "all") params.set("category", catFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 8000)
    fetch("/api/products?" + params.toString(), { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.success) setProducts(d.data)
        else setError(d.error || "产品加载失败")
      })
      .catch((err) => setError(err.name === "AbortError" ? "产品加载超时，请刷新重试" : "产品加载失败，请稍后重试"))
      .finally(() => {
        window.clearTimeout(timer)
        setLoading(false)
      })
  }

  useEffect(() => { fetchProducts() }, [search, catFilter, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">产品池</h1>
          <p className="text-sm text-muted-foreground mt-1">管理所有产品数据</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCsv(true)}><Upload className="h-4 w-4 mr-2" />CSV导入</Button>
          <Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />添加产品</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索产品名称..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="flex h-10 w-32 rounded-md border border-input bg-background px-3 text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">全部分类</option>
              {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="flex h-10 w-32 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">全部状态</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && !loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <Package className="h-8 w-8" />
              <p className="text-red-600">{error}</p>
              <Button variant="outline" onClick={fetchProducts}>重新加载</Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Package className="h-8 w-8" /><p>没有找到匹配的产品</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">产品名称</th><th className="p-4 font-medium">品类</th>
                  <th className="p-4 font-medium">价格</th><th className="p-4 font-medium">成本</th>
                  <th className="p-4 font-medium">来源</th><th className="p-4 font-medium">风险</th>
                  <th className="p-4 font-medium">状态</th><th className="p-4 font-medium">日期</th><th className="p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const risk = riskLabel(p.risk_level)
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">{p.name}</td>
                      <td className="p-4">{catLabels[p.category] || p.category}</td>
                      <td className="p-4">{formatPrice(p.price)}</td>
                      <td className="p-4">{formatPrice(p.cost)}</td>
                      <td className="p-4 text-xs text-muted-foreground">{p.source}</td>
                      <td className="p-4"><Badge variant={p.risk_level === "safe" ? "success" : p.risk_level === "warning" ? "warning" : "destructive"}>{risk.label}</Badge></td>
                      <td className="p-4"><Badge variant={p.status === "published" || p.status === "tracking" || p.status === "scale" ? "success" : p.status === "rejected" ? "destructive" : "secondary"}>{statusLabels[p.status] || p.status || "未知"}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(p.created_at)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setCurrentProduct(p); setShowRelease(true) }}><Calendar className="h-4 w-4 mr-1" />发布</Button>
                          <Button size="sm" variant="outline" onClick={() => { setCurrentProduct(p); setShowMetrics(true) }}><BarChart3 className="h-4 w-4 mr-1" />日数据</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AddProductModal open={showModal} onClose={() => setShowModal(false)} onSuccess={() => { toast("success", "产品已添加"); fetchProducts() }} />
      <CsvImportModal open={showCsv} onClose={() => setShowCsv(false)} onSuccess={(n) => { toast("success", "导入完成", "成功导入 " + n + " 条产品"); fetchProducts() }} />

      <ReleaseDataModal open={showRelease} onClose={() => setShowRelease(false)} productId={currentProduct?.id || ""} productName={currentProduct?.name || ""} onSuccess={() => { toast("success", "发布数据已保存"); fetchProducts() }} />
      <DailyMetricsModal open={showMetrics} onClose={() => setShowMetrics(false)} productId={currentProduct?.id || ""} productName={currentProduct?.name || ""} onSuccess={() => { toast("success", "日数据已保存") }} />    </div>
  )
}
