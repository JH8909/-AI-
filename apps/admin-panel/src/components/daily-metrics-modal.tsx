"use client"
import { useState } from "react"
import { X, Loader2, BarChart3 } from "lucide-react"

interface Props { open: boolean; onClose: () => void; productId: string; productName: string; onSuccess: () => void }

export default function DailyMetricsModal({ open, onClose, productId, productName, onSuccess }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [views, setViews] = useState("")
  const [likes, setLikes] = useState("")
  const [shares, setShares] = useState("")
  const [sales, setSales] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const handleSave = async () => {
    setSaving(true); setError("")
    try {
      const r = await fetch("/api/data-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId, snapshot_date: date,
          views: parseInt(views) || 0, likes: parseInt(likes) || 0,
          shares: parseInt(shares) || 0, sales_estimate: parseInt(sales) || 0,
        })
      })
      const d = await r.json()
      if (d.success) { onSuccess(); onClose() }
      else setError(d.error || "保存失败")
    } catch { setError("网络错误") }
    setSaving(false)
  }

  const f = (label: string, val: string, set: any, ph: string) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
    </div>
  )

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />录入日数据</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">产品: <span className="font-medium">{productName}</span></p>
          {f("日期", date, setDate, "2026-06-24")}
          <div className="grid grid-cols-2 gap-3">
            {f("浏览量", views, setViews, "0")}
            {f("点赞量", likes, setLikes, "0")}
            {f("分享量", shares, setShares, "0")}
            {f("预估销量", sales, setSales, "0")}
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">取消</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}保存
          </button>
        </div>
      </div>
    </div>
  )
}
