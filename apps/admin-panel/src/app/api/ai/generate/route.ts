import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"
import { getSupabaseClient } from "@/lib/supabase"
import { toChatCompletionsUrl } from "@/lib/import-link-utils"

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()
  const product = body.product || {}
  const name = body.productName || product.name || "产品"
  const desc = body.productDesc || product.description || ""
  const isXH = body.platform === "xiaohongshu"

  if (!cfg.deepseekApiKey) {
    return apiResponse({
      title: isXH ? name + "｜用了真香" : "全新" + name,
      body: isXH ? "最近入了" + name + "，真的太好用了！#好物推荐" : name + "全新好价，欢迎咨询。",
      hashtags: isXH ? ["好物推荐", "种草"] : [],
      price_suggestion: null,
      image_prompt: "Product shot on clean background",
      model_used: "mock"
    })
  }

  try {
    const prompt = isXH
      ? '为"' + name + '"写一篇小红书种草文案。产品: ' + desc + '。输出JSON: title, body(带emoji), hashtags, image_prompt'
      : '为"' + name + '"写一篇闲鱼上架文案。产品: ' + desc + '。输出JSON: title, body, price_suggestion, image_prompt'
    
    const res = await fetch(toChatCompletionsUrl(cfg.llmBaseURL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel, messages: [
          { role: "system", content: "专业" + (isXH ? "小红书" : "闲鱼") + "内容创作者。输出JSON。" },
          { role: "user", content: prompt }
        ], response_format: { type: "json_object" }, temperature: 0.8, max_tokens: 2048
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
    const responseData = { ...data, model_used: cfg.defaultModel }
    const productId = product.id || body.product_id
    const supabase = await getSupabaseClient()
    if (supabase && productId) {
      const draftData = {
        product_id: productId,
        platform: body.platform || "xiaohongshu",
        content_type: "product_post",
        title: data.title || "",
        body: data.body || "",
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
        price_suggestion: data.price_suggestion ?? null,
        image_prompt: data.image_prompt || null,
        status: "pending",
        model_used: cfg.defaultModel,
        tokens_used: result.usage?.total_tokens || 0,
      }
      const { data: draft, error } = await supabase.from("content_drafts").insert(draftData).select("*, products(name)").single()
      if (error) return apiError(error.message)
      await supabase.from("review_queue").insert({ content_draft_id: draft.id, status: "pending" })
      return apiResponse({
        ...draft,
        productName: draft.products?.name || name,
        priceSuggestion: draft.price_suggestion,
      }, 201)
    }
    return apiResponse(responseData)
  } catch (err: any) {
    return apiError(err.message || "内容生成调用失败")
  }
}
