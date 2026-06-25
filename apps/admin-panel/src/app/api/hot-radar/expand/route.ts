import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSupabaseClient } from "@/lib/supabase"
import { getSettings, initSettings } from "@/lib/settings-store"
import { toChatCompletionsUrl } from "@/lib/import-link-utils"
import { boundedStringList, readJson } from "../api-utils"

export async function POST(req: Request) {
  const body = await readJson(req)
  const seeds = boundedStringList(body.keywords || body.seeds, 10)
  if (!seeds.length) return apiError("请提供需要扩展的种子关键词", 400)

  await initSettings()
  const cfg = getSettings()
  if (!cfg.deepseekApiKey) return apiError("DeepSeek API Key 未配置，无法扩展关键词", 503)

  try {
    const res = await fetch(toChatCompletionsUrl(cfg.llmBaseURL), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.deepseekApiKey}` },
      body: JSON.stringify({
        model: cfg.defaultModel,
        messages: [
          { role: "system", content: "你是电商选品关键词研究员。只输出 JSON。" },
          { role: "user", content: `基于这些 1688 选品关键词扩展同义词、长尾词和类目词，每个种子最多 5 个。输出 {"keywords":["..."]}。种子：${seeds.join(",")}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 1200,
      }),
    })
    if (!res.ok) return apiError(`DeepSeek API 错误: ${(await res.text()).slice(0, 200)}`, 502)

    const result = await res.json()
    const parsed = JSON.parse(result.choices?.[0]?.message?.content || "{}")
    const expanded = boundedStringList(parsed.keywords, 50).filter((item) => !seeds.includes(item))

    const supabase = await getSupabaseClient()
    if (supabase && expanded.length) {
      await supabase.from("monitor_keywords").upsert(
        expanded.map((keyword) => ({ keyword, kind: "expanded", enabled: true })),
        { onConflict: "keyword" }
      )
    }

    return apiResponse({ seeds, expanded, model_used: cfg.defaultModel })
  } catch (err: any) {
    return apiError(err.message || "关键词扩展失败")
  }
}
