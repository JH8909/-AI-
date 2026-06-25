import { apiResponse } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()

  if (!cfg.deepseekApiKey) {
    return apiResponse({
      summary: "请配置DeepSeek API Key",
      exposure_analysis: "Mock: 曝光稳定",
      engagement_analysis: "Mock: 互动健康",
      conversion_analysis: "Mock: 转化正常",
      risk_warning: (body.snapshots || []).length < 7 ? "数据不足7天" : "数据完整",
      suggestion: "持续录入数据后重新生成",
      model_used: "mock"
    })
  }

  const prompt = "基于产品" + body.product_name + "的7天数据分析: 数据=" + JSON.stringify(body.snapshots || []) + ". 输出JSON: summary, exposure_analysis, engagement_analysis, conversion_analysis, risk_warning, suggestion"

  try {
    const url = (cfg.llmBaseURL || "https://api.deepseek.com/v1") + "/chat/completions"
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel,
        messages: [
          { role: "system", content: "电商数据分析师。输出JSON。" },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2048
      })
    })
    if (!res.ok) {
      const t = await res.text()
      return apiResponse({ summary: "AI调用失败: " + t.slice(0, 100), model_used: "error" })
    }
    const result = await res.json()
    const content = result.choices?.[0]?.message?.content || "{}"
    const data = JSON.parse(content)
    return apiResponse({ ...data, model_used: cfg.defaultModel })
  } catch (err: any) {
    return apiResponse({ summary: "AI报告生成失败: " + (err.message || "").slice(0, 100), model_used: "error" })
  }
}
