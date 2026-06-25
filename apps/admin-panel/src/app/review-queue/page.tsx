"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, AlertTriangle, MessageSquare, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function ReviewQueuePage() {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [_checklist, setChecklist] = useState<string[]>([])

  const fetchQueue = () => {
    fetch("/api/review-queue").then(r => r.json()).then(d => {
      if (d.success) setQueue(d.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { fetchQueue() }, [])

  const handleReview = async (id: string, action: string) => {
    await fetch("/api/review-queue", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: action, comment, checklist: _checklist })
    })
    setReviewingId(null)
    setComment("")
    setChecklist([])
    fetchQueue()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">审核队列</h1><p className="text-sm text-muted-foreground mt-1">待审核 {queue.length} 条内容</p></div>
        <Badge variant="warning" className="text-sm px-3 py-1">待处理 {queue.length} 项</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
      ) : queue.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><CheckCircle className="h-8 w-8 text-green-500" /><p>审核队列已清空</p></CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {queue.map((item) => (
            <Card key={item.id} className={item.riskNote ? "border-orange-300" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.platform === "xiaohongshu" ? "default" : "secondary"}>{item.platform === "xiaohongshu" ? "小红书" : "闲鱼"}</Badge>
                    {item.riskNote && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />风险提示</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                </div>
                {item.riskNote && <div className="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-3"><p className="text-sm text-orange-700 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{item.riskNote}</p></div>}
                <p className="text-xs text-muted-foreground mb-1">产品：{item.productName}</p>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.body}</p>

                {reviewingId === item.id ? (
                  <div className="space-y-3">
                    {/* Checklist for high risk items */}
                    {item.is_high_risk && (
                      <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 space-y-2">
                        <p className="text-sm font-medium text-orange-700 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />高风险内容，请逐项确认</p>
                        {[
                          { key: "compliant", label: "产品合规: 非仿牌/医疗/减肥/保健品" },
                          { key: "truthful", label: "内容真实: 无虚假宣传" },
                          { key: "reasonable_price", label: "价格合理: 在市场范围内" },
                          { key: "quality", label: "文案质量: 语句通顺" },
                          { key: "accurate_tags", label: "标签准确: 话题标签相关" },
                        ].map((check) => (
                          <label key={check.key} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={_checklist.includes(check.key)} onChange={() => {
                              setChecklist((prev: string[]) => prev.includes(check.key) ? prev.filter((k: string) => k !== check.key) : [...prev, check.key])
                            }} className="h-4 w-4 rounded border-gray-300" />
                            {check.label}
                          </label>
                        ))}
                      </div>
                    )}
                    <Textarea placeholder="审核意见（驳回时必填）..." value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleReview(item.id, "approved")} disabled={item.is_high_risk && _checklist.length < 5}><CheckCircle className="h-4 w-4 mr-1" />通过</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReview(item.id, "rejected")} disabled={!comment.trim()}><XCircle className="h-4 w-4 mr-1" />驳回</Button>
                      <Button size="sm" variant="outline" onClick={() => { setReviewingId(null); setComment(""); setChecklist([]) }}>取消</Button>
                    </div>
                    {item.is_high_risk && _checklist.length < 5 && <p className="text-xs text-orange-600">高风险内容需勾选全部5项后才能通过</p>}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => setReviewingId(item.id)}><MessageSquare className="h-4 w-4 mr-1" />审核</Button>
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleReview(item.id, "approved")}><CheckCircle className="h-4 w-4 mr-1" />快速通过</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
