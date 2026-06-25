import { getSettings, initSettings } from "@/lib/settings-store"

type SourceItem = {
  title: string
  link: string | null
  publishedAt: string | null
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
}

function textBetween(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match ? decodeEntities(stripTags(match[1])) : ""
}

function parseXmlFeed(xml: string): SourceItem[] {
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || []
  return itemBlocks.map((block) => {
    const atomLink = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || ""
    return {
      title: textBetween(block, "title"),
      link: textBetween(block, "link") || atomLink || null,
      publishedAt: textBetween(block, "pubDate") || textBetween(block, "updated") || textBetween(block, "published") || null,
    }
  }).filter((item) => item.title)
}

function defaultTrendSources() {
  const queries = [
    "小红书 爆款 好物",
    "抖音 爆款 好物",
    "闲鱼 热卖 好物",
    "1688 热卖 小商品",
  ]
  return queries.map((query) => `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`)
}

function keywordHints(title: string) {
  const cleaned = title.replace(/[^\p{Script=Han}a-zA-Z0-9\s]/gu, " ")
  return Array.from(new Set(cleaned.split(/\s+/).map((item) => item.trim()).filter((item) => item.length >= 2))).slice(0, 6)
}

function inferCategory(text: string) {
  if (/露营|户外|运动|骑行|健身/.test(text)) return "sports"
  if (/收纳|厨房|家居|桌面|清洁/.test(text)) return "home"
  if (/美妆|护肤|化妆/.test(text)) return "beauty"
  if (/耳机|充电|数码|手机|电脑/.test(text)) return "electronics"
  if (/穿搭|鞋|包|服饰/.test(text)) return "fashion"
  return "other"
}

function inferPlatform(link: string | null, title: string) {
  const text = `${link || ""} ${title}`.toLowerCase()
  if (text.includes("xiaohongshu") || text.includes("小红书")) return "xiaohongshu"
  if (text.includes("douyin") || text.includes("抖音")) return "douyin"
  if (text.includes("xianyu") || text.includes("闲鱼")) return "xianyu"
  if (text.includes("1688")) return "1688"
  return "public_web"
}

export async function collectPublicTrendCandidates(limit = 8) {
  await initSettings()
  const settings = getSettings()
  const configured = settings.trendSourceUrls
    ? settings.trendSourceUrls.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)
    : []
  const sources = configured.length ? configured : defaultTrendSources()
  const rows: any[] = []

  for (const sourceUrl of sources) {
    if (rows.length >= limit) break
    try {
      const res = await fetch(sourceUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 ecommerce-ai-automation/1.0",
          accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = parseXmlFeed(xml)
      for (const item of items) {
        if (rows.length >= limit) break
        const keywords = keywordHints(item.title)
        const idBase = `${item.link || item.title}`.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-").slice(0, 80)
        rows.push({
          id: `live-${Buffer.from(idBase).toString("base64url").slice(0, 24)}`,
          name: item.title.slice(0, 48),
          originalTitle: item.title,
          description: `公开趋势源采集：${item.title}`,
          platform: inferPlatform(item.link, item.title),
          sourceUrl: item.link,
          heat: 62,
          growth: 18,
          priceBand: "待验证",
          targetAudience: "待验证",
          contentScene: "待验证",
          category: inferCategory(item.title),
          keywords,
          status: "new",
          riskLevel: "safe",
        })
      }
    } catch {}
  }

  return rows
}
