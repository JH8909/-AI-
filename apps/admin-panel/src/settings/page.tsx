"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"

export default function SettingsPage() {
  const [deepseekKey, setDeepseekKey] = useState("")
  const [model, setModel] = useState("deepseek-chat")
  const [baseURL, setBaseURL] = useState("")
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.success) {
        setDeepseekKey(d.data.deepseekApiKey || "")
        setModel(d.data.defaultModel || "deepseek-chat")
        setBaseURL(d.data.llmBaseURL || "")
        setSupabaseUrl(d.data.supabaseUrl || "")
        setSupabaseKey(d.data.supabaseKey || "")
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
        body: JSON.stringify({
          deepseekApiKey: deepseekKey,
          defaultModel: model,
          llmBaseURL: baseURL,
          supabaseUrl,
          supabaseKey: supabaseKey,
        })
      })
      const d = await r.json()
      if (d.success) {
        setMessage({ type: "success", text: "✅ 配置已保存！立即生效，无需重启。" })
      } else {
        setMessage({ type: "error", text: d.error || "保存失败" })
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "网络错误" })
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Test the AI API with a simple product
      const r = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: { name: "测试产品", description: "简单测试", category: "other", price: 99 }
        })
      })
      const d = await r.json()
      if (d.success && d.data.overall_score > 0) {
        const isMock = d.data.model_used === "mock"
        setTestResult(isMock
          ? "⚠️ 未检测到API Key，返回了Mock数据。请先填入DeepSeek API Key并保存。"
          : `✅ AI响应成功！综合评分: ${d.data.overall_score}/10 (模型: ${d.data.model_used})`
        )
      } else {
        setTestResult(`❌ AI调用失败: ${d.error || "未知错误"}`)
      }
    } catch (err: any) {
      setTestResult(`❌ 连接失败: ${err.message}`)
    }
    setTesting(false)
  }

  const hasApiKey = deepseekKey.trim().length > 0

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin mr-2" />加载中...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* Status Banner */}
      <Card className={hasApiKey ? "border-green-300" : "border-yellow-300"}>
        <CardContent className="p-4 flex items-center gap-3">
          {hasApiKey
            ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            : <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          }
          <div>
            <p className="text-sm font-medium">
              {hasApiKey ? "LLM API Key 已配置" : "LLM API Key 未配置"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasApiKey
                ? "AI评分、竞品分析、内容生成将使用真实AI模型"
                : "目前使用Mock模式。填入DeepSeek API Key后点击保存，立即生效。"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* LLM Config */}
      <Card>
        <CardHeader>
          <CardTitle>LLM 模型配置</CardTitle>
          <CardDescription>配置 AI 分析使用的模型提供商（推荐 DeepSeek）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* DeepSeek API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">DeepSeek API Key
              <span className="text-xs text-muted-foreground ml-2">（必填才能用真实AI）</span>
            </label>
            <Input
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={deepseekKey}
              onChange={e => setDeepseekKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">从 <a href="https://platform.deepseek.com/api_keys" target="_blank" className="text-blue-600 underline" rel="noreferrer">platform.deepseek.com</a> 获取</p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium">默认模型</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              <option value="deepseek-chat">deepseek-chat (DeepSeek V3)</option>
              <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek R1)</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet</option>
            </select>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Base URL
              <span className="text-xs text-muted-foreground ml-2">（可选，使用DeepSeek留空）</span>
            </label>
            <Input
              placeholder="https://api.deepseek.com/v1"
              value={baseURL}
              onChange={e => setBaseURL(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saving ? "保存中..." : "保存配置"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              测试连接
            </Button>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {message.text}
            </div>
          )}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${testResult.startsWith("✅") ? "bg-green-50 text-green-700" : testResult.startsWith("⚠️") ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
              {testResult}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supabase Config */}
      <Card>
        <CardHeader>
          <CardTitle>数据库配置（可选）</CardTitle>
          <CardDescription>配置 Supabase 数据库，留空则使用 Mock 数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Supabase URL</label>
            <Input placeholder="https://your-project.supabase.co" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Supabase Anon Key</label>
            <Input type="password" placeholder="eyJhbGciOiJIUzI1NiIs..." value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Security Rules */}
      <Card>
        <CardHeader>
          <CardTitle>安全规则</CardTitle>
          <CardDescription>内容安全与合规设置（固定配置，不可修改）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">敏感词过滤</p>
              <p className="text-xs text-muted-foreground">自动拦截仿牌/医疗/减肥等内容</p>
            </div>
            <span className="text-sm text-green-600 font-medium">已启用</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">人工审核</p>
              <p className="text-xs text-muted-foreground">所有内容须人工审核后才能使用</p>
            </div>
            <span className="text-sm text-green-600 font-medium">已启用</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm">自动发布</p>
              <p className="text-xs text-muted-foreground">禁止自动发布到任何平台</p>
            </div>
            <span className="text-sm text-red-600 font-medium">已禁用</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
