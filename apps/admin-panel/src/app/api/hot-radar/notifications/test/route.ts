import { apiResponse, apiError } from "@/lib/data/mock-data"
import { getSettings, initSettings } from "@/lib/settings-store"
import { boundedEnum, readJson } from "../../api-utils"

async function sendWebhook(url: string, text: string) {
  const body = url.includes("feishu.cn") ? { msg_type: "text", content: { text } } : { msgtype: "text", text: { content: text } }
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.text()).slice(0, 200))
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const channel = boundedEnum(body.channel, ["wecom", "feishu"], "wecom")
  await initSettings()
  const cfg = getSettings()
  const webhook = channel === "wecom" ? cfg.wecomWebhookUrl : cfg.feishuWebhookUrl
  if (!webhook) return apiError(`${channel} webhook 未配置`, 503)

  try {
    await sendWebhook(webhook, "1688 爆品雷达测试消息")
    return apiResponse({ channel, status: "sent" })
  } catch (err: any) {
    return apiError(err.message || "测试通知发送失败", 502)
  }
}
