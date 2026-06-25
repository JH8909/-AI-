import { apiResponse } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"

function mockAssets(productName: string) {
  return {
    xiaohongshu: { title: productName + "｜用了真香", body: "最近入了" + productName + "，太好用了！", hashtags: ["好物推荐"] },
    xianyu: { title: "全新" + productName, body: productName + "全新好价。", price_suggestion: null },
    image_prompt: { cn: "产品在干净桌面上的特写", en: "Product shot on clean desk" },
    reply_templates: { price_inquiry: "价格已经很优惠了", quality_concern: "材料品质有保障", shipping_inquiry: "下单后24小时发货" },
    model_used: "mock"
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  await initSettings()
  const cfg = getSettings()

  const productName = body.productName || body.product?.name || "产品"
  if (!cfg.deepseekApiKey) return apiResponse(mockAssets(productName))

  try {
    const prompt = "为产品" + productName + "(" + (body.productDesc || body.product?.description || "") + ")生成完整内容资产包。输出JSON: xiaohongshu({title, body, hashtags}), xianyu({title, body, price_suggestion}), image_prompt({cn, en}), reply_templates({price_inquiry, quality_concern, shipping_inquiry})"
    const res = await fetch((cfg.llmBaseURL || "https://api.deepseek.com/v1") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekApiKey },
      body: JSON.stringify({
        model: cfg.defaultModel, messages: [
          { role: "system", content: "电商内容创作者。输出JSON。" },
          { role: "user", content: prompt }
        ], response_format: { type: "json_object" }, temperature: 0.8, max_tokens: 4096
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return apiResponse(mockAssets(productName))
    const result = await res.json()
    const data = JSON.parse(result.choices?.[0]?.message?.content || "{}")
    return apiResponse({ ...data, model_used: cfg.defaultModel })
  } catch (err: any) {
    return apiResponse(mockAssets(productName))
  }
}
