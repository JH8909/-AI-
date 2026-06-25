"use client"

import { useState } from "react"
import type { ChangeEvent, MouseEvent } from "react"
import { X, Loader2, Link, Sparkles } from "lucide-react"

interface AddProductModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const categories = [
  { value: "fashion", label: "服饰" }, { value: "electronics", label: "电子" },
  { value: "home", label: "家居" }, { value: "beauty", label: "美妆" },
  { value: "food", label: "食品" }, { value: "sports", label: "运动" },
  { value: "toys", label: "玩具" }, { value: "books", label: "图书" },
  { value: "digital", label: "数码" }, { value: "other", label: "其他" },
]

export default function AddProductModal({ open, onClose, onSuccess }: AddProductModalProps) {
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [category, setCategory] = useState("home")
  const [price, setPrice] = useState("")
  const [cost, setCost] = useState("")
  const [tags, setTags] = useState("")
  const [url, setUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const handleSubmit = async () => {
    if (!name.trim()) { setError("产品名称不能为空"); return }
    setError("")
    setSaving(true)
    try {
      const body: any = { name: name.trim(), description: desc.trim(), category, source: "manual" }
      if (price) body.price = parseFloat(price)
      if (cost) body.cost = parseFloat(cost)
      if (tags.trim()) body.tags = tags.split(",").map(t => t.trim()).filter(Boolean)
      if (url.trim()) body.source_url = url.trim()

      const r = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (d.success) {
        setName(""); setDesc(""); setPrice(""); setCost(""); setTags(""); setUrl("")
        onSuccess()
        onClose()
      } else {
        setError(d.error || "保存失败")
      }
    } catch (err: any) {
      setError(err.message || "网络错误")
    }
    setSaving(false)
  }

  const Input = ({ label, value, onChange, type = "text", placeholder, required }: any) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {type === "select" ? (
        <select value={value} onChange={onChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
          {onChange.options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold">添加产品</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {/* Body */}
        <div className="p-5 space-y-3">
          <Input label="产品名称" required value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="输入产品名称" />
          <Input label="描述" value={desc} onChange={(e: ChangeEvent<HTMLInputElement>) => setDesc(e.target.value)} placeholder="可选" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">分类<span className="text-red-500 ml-1">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="价格(元)" type="number" value={price} onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)} placeholder="0.00" />
            <Input label="成本(元)" type="number" value={cost} onChange={(e: ChangeEvent<HTMLInputElement>) => setCost(e.target.value)} placeholder="0.00" />
          </div>
          <Input label="标签(逗号分隔)" value={tags} onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} placeholder="手机支架,铝合金,桌面" />
          <div className="space-y-1.5">
              <label className="text-sm font-medium">1688链接一键提取 <span className="text-xs text-muted-foreground">(粘贴后自动提取)</span></label>
              <div className="flex gap-2">
                <input type="url" value={url} onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} placeholder="https://detail.1688.com/..."
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
                <button disabled={extracting || !url.trim()} onClick={async () => {
                  if (!url.trim()) return
                  setExtracting(true)
                  setError("")
                  try {
                    const r = await fetch("/api/products/import-link", {
                      method: "POST", headers: {"Content-Type":"application/json"},
                      body: JSON.stringify({ url: url.trim() })
                    })
                    const d = await r.json()
                    if (d.success && d.data) {
                      if (d.data.name) setName(d.data.name)
                      if (d.data.description) setDesc(d.data.description)
                      if (d.data.price) setPrice(String(d.data.price))
                      if (d.data.category) setCategory(d.data.category)
                      if (d.data.tags) setTags(d.data.tags.join(", "))
                      setError("")
                    } else {
                      setError(d.error || "提取失败，请手动填写")
                    }
                  } catch { setError("网络错误") }
                  setExtracting(false)
                }} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 shrink-0">
                  {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{extracting ? "提取中..." : "提取"}
                </button>
              </div>
            </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">取消</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}保存
          </button>
        </div>
      </div>
    </div>
  )
}
