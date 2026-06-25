"use client"

import { useState, useRef } from "react"
import { X, Upload, FileText, AlertTriangle, Loader2 } from "lucide-react"

interface Props { open: boolean; onClose: () => void; onSuccess: (count: number) => void }

export default function CsvImportModal({ open, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; blocked: number } | null>(null)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter(l => l.trim())
    if (lines.length < 2) { setError("CSV文件至少需要标题行+1行数据"); return }
    const h = lines[0].split(",").map(s => s.trim().replace(/^"|"$/g, ""))
    setHeaders(h)
    const data = lines.slice(1).map(line => {
      const vals = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""))
      const obj: any = {}
      h.forEach((key, i) => { obj[key] = vals[i] || "" })
      return obj
    })
    setRows(data)
    setError("")
    setResult(null)
  }

  const handleFile = (file: File) => {
    setLoading(true)
    setError("")
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
      setLoading(false)
    }
    reader.onerror = () => { setError("文件读取失败"); setLoading(false) }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setImporting(true)
    let imported = 0, skipped = 0, blocked = 0
    for (const row of rows) {
      if (!row["产品名称"] && !row["name"]) { skipped++; continue }
      try {
        const body: any = { name: row["产品名称"] || row["name"] || "", description: row["描述"] || row["description"] || "", category: "other" }
        // Map category
        const catMap: Record<string, string> = { "家居": "home", "服饰": "fashion", "电子": "electronics", "美妆": "beauty", "食品": "food", "运动": "sports", "玩具": "toys", "图书": "books", "数码": "digital" }
        body.category = catMap[row["分类"] || row["category"] || ""] || "other"
        if (row["价格"] || row["price"]) body.price = parseFloat(row["价格"] || row["price"] || "0") || 0
        if (row["成本"] || row["cost"]) body.cost = parseFloat(row["成本"] || row["cost"] || "0") || 0
        if (row["标签"] || row["tags"]) body.tags = (row["标签"] || row["tags"] || "").split(/[,，;；]/).map((t: string) => t.trim()).filter(Boolean)
        if (row["链接"] || row["source_url"]) body.source_url = row["链接"] || row["source_url"]
        body.source = "csv_import"

        // Check sensitive keywords
        const text = (body.name + " " + (body.description || "") + " " + (body.tags || []).join(" ")).toLowerCase()
        const blockedKws = ["仿牌", "原单", "复刻", "高仿", "减肥", "瘦身", "医疗", "治疗", "保健品"]
        if (blockedKws.some(kw => text.includes(kw))) { blocked++; continue }

        const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        const d = await r.json()
        if (d.success) imported++; else skipped++
      } catch { skipped++ }
    }
    setResult({ imported, skipped, blocked })
    setImporting(false)
    if (imported > 0) onSuccess(imported)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3 shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="h-5 w-5" />CSV导入产品</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Drop zone */}
          {rows.length === 0 && !loading && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">拖拽CSV文件到此处</p>
              <p className="text-sm text-muted-foreground mt-1">或点击选择文件</p>
              <p className="text-xs text-muted-foreground mt-2">支持 UTF-8/GBK 编码，最大 5MB</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin mr-2" />解析中...</div>}

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>}

          {/* Preview table */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">预览 (前10行 / 共{rows.length}行)</p>
                <button onClick={() => { setRows([]); setHeaders([]); setResult(null) }} className="text-xs text-muted-foreground underline">重新选择</button>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50">
                    {headers.slice(0, 6).map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        {headers.slice(0, 6).map((h, j) => <td key={j} className="px-3 py-2 truncate max-w-[150px]">{row[h] || "-"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Result */}
              {result && (
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <p className="font-medium">导入完成</p>
                  <p className="text-green-600">成功: {result.imported} 条</p>
                  <p className="text-yellow-600">跳过: {result.skipped} 条</p>
                  <p className="text-red-600">拦截: {result.blocked} 条 含敏感词</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && !result && (
          <div className="flex justify-end gap-2 border-t px-5 py-3 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">取消</button>
            <button onClick={handleImport} disabled={importing}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              导入 {rows.length} 条产品
            </button>
          </div>
        )}

        {result && (
          <div className="flex justify-end gap-2 border-t px-5 py-3 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">关闭</button>
          </div>
        )}
      </div>
    </div>
  )
}
