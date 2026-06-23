import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"
import { getSupabaseClient } from "@/lib/supabase"
import { toChatCompletionsUrl } from "@/lib/import-link-utils"

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()

  if (!cfg.deepseekApiKey) {
    return apiResponse({
      market_demand: 7, profit_margin: 6, competition_intensity: 5,
      compliance_risk: 3, content_fit: 8, overall_score: 7.2,
      overall_reasoning: "请先在【设置】页面配置DeepSeek API Key。",
      model_used: "mock"
    })
  }

  try {
    const product = body.product || {}
    const prompt = `你是一个专业的电商选品分析师。对产品进行多维度打分(1-10)。
产品信息: ${JSON.stringify(product)}
评分维度: market_demand, profit_margin, competition_intensity, compliance_risk, content_fit, overall_score
安全红线: 仿牌/医疗/减肥/保健品自动低分
输出严格JSON格式。原因用中文。`
    const res = await fetch(toChatCompletionsUrl(cfg.llmBaseURL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel, messages: [
          { role: "system", content: "专业电商选品分析师。输出JSON。" },
          { role: "user", content: prompt }
        ], response_format: { type: "json_object" },
        temperature: 0.7, max_tokens: 4096
      })
    })
    if (!res.ok) {
      const errText = await res.text()
      let errMsg = errText
      try { const j = JSON.parse(errText); errMsg = j.error?.message || j.error || errText } catch {}
      return apiError("DeepSeek API 错误: " + errMsg.slice(0, 200))
    }
    const result = await res.json()
    if (!result.choices?.[0]?.message?.content) {
      return apiError("AI返回内容为空，请检查API Key是否正确")
    }
    const data = JSON.parse(result.choices[0].message.content)
    const responseData = { ...data, model_used: cfg.defaultModel }
    const productId = product.id || body.product_id
    const supabase = await getSupabaseClient()
    if (supabase && productId) {
      const insertData = {
        product_id: productId,
        market_demand: Number(data.market_demand) || 1,
        profit_margin: Number(data.profit_margin) || 1,
        competition_intensity: Number(data.competition_intensity) || 1,
        compliance_risk: Number(data.compliance_risk) || 1,
        content_fit: Number(data.content_fit) || 1,
        overall_score: Number(data.overall_score) || 1,
        reasoning: data.reasoning || data.overall_reasoning || "",
        model_used: cfg.defaultModel,
        tokens_used: result.usage?.total_tokens || 0,
      }
      const { data: saved, error } = await supabase.from("product_scores").insert(insertData).select("*, products(name)").single()
      if (error) return apiError(error.message)
      return apiResponse({ ...saved, productName: saved.products?.name || product.name })
    }
    return apiResponse(responseData)
  } catch (err: any) {
    return apiError(err.message || "AI评分调用失败")
  }
}
