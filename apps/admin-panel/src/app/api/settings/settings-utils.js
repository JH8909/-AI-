function publicSettings(settings) {
  const { serviceRoleKey, deepseekApiKey, ...safe } = settings
  return {
    ...safe,
    deepseekApiKey: "",
    hasDeepSeekApiKey: Boolean(deepseekApiKey),
    hasSupabaseServiceRoleKey: Boolean(serviceRoleKey),
  }
}

function settingsPatchFromBody(body) {
  const patch = {
    defaultModel: body.defaultModel || "deepseek-chat",
    llmBaseURL: body.llmBaseURL || "",
    supabaseUrl: body.supabaseUrl || "",
    supabaseKey: body.supabaseKey || "",
  }

  if (typeof body.deepseekApiKey === "string" && body.deepseekApiKey.trim()) {
    patch.deepseekApiKey = body.deepseekApiKey.trim()
  }

  if (typeof body.serviceRoleKey === "string" && body.serviceRoleKey.trim()) {
    patch.serviceRoleKey = body.serviceRoleKey.trim()
  }

  return patch
}

module.exports = { publicSettings, settingsPatchFromBody }
