import { apiResponse } from "@/lib/data/mock-data"

export async function POST() {
  return apiResponse({ sent: true, channels: ["wecom", "feishu"], mock: true, note: "Webhook URL 未配置" })
}
