import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"
import { toChatCompletionsUrl } from "@/lib/import-link-utils"

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()

  if (!cfg.deepseekApiKey) {
    return apiResponse({
      price_comparison: "请先在【设置】页面配置LLM API Key",
      differentiation: "Mock", content_strategy: "Mock", overall_report: "Mock", competitor_details: []
    })
  }

  try {
    const prompt = `分析以下产品与竞品的差异:
目标产品: ${body.productName} - ${body.productDesc}
竞品: ${JSON.stringify(body.competitors || [])}
输出JSON: price_comparison, differentiation, content_strategy, overall_report, competitor_details[]`
    const res = await fetch(toChatCompletionsUrl(cfg.llmBaseURL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel, messages: [
          { role: "system", content: "专业竞品分析师。输出JSON。" },
          { role: "user", content: prompt }
        ], response_format: { type: "json_object" }, temperature: 0.7, max_tokens: 4096
      })
    })
    if (!res.ok) {
      const errText = await res.text()
      let errMsg = errText
      try { const j = JSON.parse(errText); errMsg = j.error?.message || j.error || errText } catch {}
      return apiError("AI API 错误: " + errMsg.slice(0, 200))
    }
    const result = await res.json()
    if (!result.choices?.[0]?.message?.content) {
      return apiError("AI返回内容为空")
    }
    const data = JSON.parse(result.choices[0].message.content)
    return apiResponse(data)
  } catch (err: any) {
    return apiError(err.message || "竞品分析调用失败")
  }
}
