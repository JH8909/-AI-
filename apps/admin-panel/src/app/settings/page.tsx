"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

export default function SettingsPage() {
  const [deepseekKey, setDeepseekKey] = useState("")
  const [model, setModel] = useState("deepseek-chat")
  const [baseURL, setBaseURL] = useState("")
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [serviceRoleKey, setServiceRoleKey] = useState("")
  const [hasServiceRoleKey, setHasServiceRoleKey] = useState(false)
  const [hasSavedDeepSeekKey, setHasSavedDeepSeekKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dbSaving, setDbSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [dbMessage, setDbMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.success) {
        setDeepseekKey("")
        setHasSavedDeepSeekKey(Boolean(d.data.hasDeepSeekApiKey))
        setModel(d.data.defaultModel || "deepseek-chat")
        setBaseURL(d.data.llmBaseURL || "")
        setSupabaseUrl(d.data.supabaseUrl || "")
        setSupabaseKey(d.data.supabaseKey || "")
        setHasServiceRoleKey(Boolean(d.data.hasSupabaseServiceRoleKey))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deepseekApiKey: deepseekKey, defaultModel: model, llmBaseURL: baseURL, supabaseUrl, supabaseKey })
      })
      const d = await r.json()
      setMessage({ type: d.success ? "success" : "error", text: d.success ? "配置已保存！立即生效，无需重启" : (d.error || "保存失败") })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "网络错误" })
    }
    setSaving(false)
  }

  const handleDatabaseSave = async () => {
    setDbSaving(true)
    setDbMessage(null)
    try {
      const payload: Record<string, string> = {
        deepseekApiKey: deepseekKey,
        defaultModel: model,
        llmBaseURL: baseURL,
        supabaseUrl,
        supabaseKey,
      }
      if (serviceRoleKey.trim()) payload.serviceRoleKey = serviceRoleKey.trim()

      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (d.success) {
        setHasServiceRoleKey(Boolean(d.data.hasSupabaseServiceRoleKey))
        setServiceRoleKey("")
      }
      setDbMessage({ type: d.success ? "success" : "error", text: d.success ? "数据库配置已保存，立即生效" : (d.error || "保存失败") })
    } catch (err: any) {
      setDbMessage({ type: "error", text: err.message || "网络错误" })
    }
    setDbSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { name: "测试", description: "测试", category: "other", price: 99 } })
      })
      const d = await r.json()
      if (d.success && d.data.overall_score > 0) {
        setTestResult(d.data.model_used === "mock"
          ? "未检测到API Key，返回了Mock数据。请先填入Key并保存。"
          : "AI响应成功！综合评分: " + d.data.overall_score + "/10 (模型: " + d.data.model_used + ")")
      } else {
        setTestResult("AI调用失败: " + (d.error || "未知错误"))
      }
    } catch { setTestResult("连接失败") }
    setTesting(false)
  }

  const hasKey = deepseekKey.trim().length > 0 || hasSavedDeepSeekKey

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-4 w-4 animate-spin mr-2" />加载中...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      <Card className={hasKey ? "border-green-300" : "border-yellow-300"}>
        <CardContent className="p-4 flex items-center gap-3">
          {hasKey ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />}
          <div>
            <p className="text-sm font-medium">{hasKey ? "LLM API Key 已配置" : "LLM API Key 未配置"}</p>
            <p className="text-xs text-muted-foreground">{hasKey ? "AI将使用真实模型" : "使用Mock模式。填入Key后点击保存，立即生效。"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>LLM 模型配置</CardTitle><CardDescription>配置AI模型提供商（推荐DeepSeek）</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">DeepSeek API Key</label>
            <Input type="password" placeholder="sk-xxx...xxxx" value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">默认模型</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={model} onChange={e => setModel(e.target.value)}>
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="deepseek-reasoner">deepseek-reasoner (R1)</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">API Base URL <span className="text-xs text-muted-foreground">（可选）</span></label>
            <Input placeholder="https://api.deepseek.com/v1" value={baseURL} onChange={e => setBaseURL(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}保存配置</Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}测试连接</Button>
          </div>
          {message && <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{message.text}</div>}
          {testResult && <div className="p-3 rounded-lg text-sm bg-blue-50 text-blue-700 border border-blue-200">{testResult}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>数据库配置（可选）</CardTitle><CardDescription>留空则使用 Mock 数据</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Supabase URL</label>
            <Input placeholder="https://your-project.supabase.co" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Supabase Anon Key</label>
            <Input type="password" placeholder="eyJhbG..." value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Supabase Service Role Key</label>
            <Input
              type="password"
              placeholder={hasServiceRoleKey ? "已保存；如需更换请重新粘贴" : "service_role secret"}
              value={serviceRoleKey}
              onChange={e => setServiceRoleKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">仅保存到本地服务端配置，用于后端写入 Supabase，不会回显到页面。</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleDatabaseSave} disabled={dbSaving}>
              {dbSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              保存数据库配置
            </Button>
            <span className={`text-xs ${hasServiceRoleKey ? "text-green-600" : "text-yellow-600"}`}>
              {hasServiceRoleKey ? "Service Role Key 已保存" : "Service Role Key 未保存"}
            </span>
          </div>
          {dbMessage && <div className={`p-3 rounded-lg text-sm ${dbMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{dbMessage.text}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>安全规则</CardTitle><CardDescription>固定配置，不可修改</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "敏感词过滤", desc: "自动拦截仿牌/医疗/减肥等内容", status: "已启用", color: "text-green-600" },
            { label: "人工审核", desc: "所有内容须人工审核后才能使用", status: "已启用", color: "text-green-600" },
            { label: "自动发布", desc: "禁止自动发布到任何平台", status: "已禁用", color: "text-red-600" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
              <span className={`text-sm font-medium ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
