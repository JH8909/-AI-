function publicSettings(settings) {
  const { serviceRoleKey, deepseekApiKey, databaseUrl, ...safe } = settings
  return {
    ...safe,
    databaseUrl: "",
    deepseekApiKey: "",
    hasDeepSeekApiKey: Boolean(deepseekApiKey),
    hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
    hasDatabaseUrl: Boolean(databaseUrl),
    hasWeComWebhookUrl: Boolean(settings.wecomWebhookUrl),
    hasFeishuWebhookUrl: Boolean(settings.feishuWebhookUrl),
  }
}

function settingsPatchFromBody(body) {
  const patch = {
    defaultModel: body.defaultModel || "deepseek-chat",
    llmBaseURL: body.llmBaseURL || "",
    supabaseUrl: body.supabaseUrl || "",
    supabaseKey: body.supabaseKey || "",
  }

  if (typeof body.trendSourceUrls === "string") {
    patch.trendSourceUrls = body.trendSourceUrls
  }

  if (typeof body.deepseekApiKey === "string" && body.deepseekApiKey.trim()) {
    patch.deepseekApiKey = body.deepseekApiKey.trim()
  }

  if (typeof body.serviceRoleKey === "string" && body.serviceRoleKey.trim()) {
    patch.serviceRoleKey = body.serviceRoleKey.trim()
  }

  if (typeof body.databaseUrl === "string" && body.databaseUrl.trim()) {
    patch.databaseUrl = body.databaseUrl.trim()
  }

  if (typeof body.wecomWebhookUrl === "string" && body.wecomWebhookUrl.trim()) {
    patch.wecomWebhookUrl = body.wecomWebhookUrl.trim()
  }

  if (typeof body.feishuWebhookUrl === "string" && body.feishuWebhookUrl.trim()) {
    patch.feishuWebhookUrl = body.feishuWebhookUrl.trim()
  }

  return patch
}

module.exports = { publicSettings, settingsPatchFromBody }
