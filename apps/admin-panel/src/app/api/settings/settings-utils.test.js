const test = require("node:test")
const assert = require("node:assert/strict")

const { publicSettings, settingsPatchFromBody } = require("./settings-utils")

test("public settings hide service role key but expose configured status", () => {
  const result = publicSettings({
    deepseekApiKey: "llm-secret",
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "anon",
    serviceRoleKey: "secret",
  })

  assert.equal(result.serviceRoleKey, undefined)
  assert.equal(result.deepseekApiKey, "")
  assert.equal(result.hasDeepSeekApiKey, true)
  assert.equal(result.hasSupabaseServiceRoleKey, true)
})

test("empty service role key does not clear existing saved key", () => {
  const patch = settingsPatchFromBody({
    deepseekApiKey: "",
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "anon",
    serviceRoleKey: "",
  })

  assert.equal(Object.hasOwn(patch, "serviceRoleKey"), false)
  assert.equal(Object.hasOwn(patch, "deepseekApiKey"), false)
})

test("omitted trend source urls do not clear existing saved sources", () => {
  const patch = settingsPatchFromBody({
    defaultModel: "deepseek-chat",
    supabaseUrl: "",
    supabaseKey: "",
  })

  assert.equal(Object.hasOwn(patch, "trendSourceUrls"), false)
})
