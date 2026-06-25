import { apiResponse } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"

function mockAnalysis() {
  return {
    recommended_price: 29.90,
    keywords: ["手机支架", "铝合金", "便携"],
    risk_reviews: ["长期使用可能松动"],
    content_angle: "桌面美学 + 性价比",
    price_comparison: "Mock分析",
    differentiation: "Mock分析",
    content_strategy: "Mock分析",
    overall_report: "Mock分析"
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()

  if (!cfg.deepseekApiKey) return apiResponse(mockAnalysis())

  try {
    const prompt = "竞品分析: 产品=" + body.productName + ", 描述=" + body.productDesc + ", 竞品=" + JSON.stringify(body.competitors || []) + ". 输出结构化JSON: recommended_price(推荐售价), keywords(5个核心关键词数组), risk_reviews(3个差评风险数组), content_angle(内容角度), price_comparison, differentiation, content_strategy, overall_report"
    const res = await fetch((cfg.llmBaseURL || "https://api.deepseek.com/v1") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel, messages: [
          { role: "system", content: "电商竞品分析师。输出JSON。" },
          { role: "user", content: prompt }
        ], response_format: { type: "json_object" }, temperature: 0.7, max_tokens: 4096
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return apiResponse(mockAnalysis())
    const result = await res.json()
    const data = JSON.parse(result.choices?.[0]?.message?.content || "{}")
    return apiResponse(data)
  } catch (err: any) {
    return apiResponse(mockAnalysis())
  }
}
