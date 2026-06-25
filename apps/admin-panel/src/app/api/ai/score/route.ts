import { apiResponse } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"

function mockScore(reason = "请配置DeepSeek API Key启用真实AI评分。") {
  return {
    market_demand: 7, profit_margin: 6, competition_intensity: 5,
    compliance_risk: 3, content_fit: 8, supply_chain_stability: 7,
    visual_packaging: 6, overall_score: 7.1,
    overall_reasoning: reason,
    model_used: "mock"
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()

  if (!cfg.deepseekApiKey) return apiResponse(mockScore())

  try {
    const prompt = "为产品" + (body.product?.name || "未知") + "进行7维评分(1-10): 市场需求度、利润空间、竞争激烈度(越低越好)、合规风险(越低越好)、内容适配度、供应链稳定性、视觉包装能力。输出JSON包含每项评分和reasoning字段。综合推荐指数overall_score(0-10)。安全红线: 仿牌/医疗自动低分。"
    const res = await fetch((cfg.llmBaseURL || "https://api.deepseek.com/v1") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel, messages: [
          { role: "system", content: "电商选品分析师。输出JSON。" },
          { role: "user", content: prompt }
        ], response_format: { type: "json_object" }, temperature: 0.7, max_tokens: 4096
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return apiResponse(mockScore("AI调用失败，已降级为Mock评分。"))
    const result = await res.json()
    const data = JSON.parse(result.choices?.[0]?.message?.content || "{}")
    return apiResponse({ ...data, model_used: cfg.defaultModel })
  } catch (err: any) {
    return apiResponse(mockScore("AI连接失败，已降级为Mock评分。"))
  }
}
