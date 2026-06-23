import { randomUUID } from "crypto"
import { execFile } from "child_process"
import { promisify } from "util"
import os from "os"
import path from "path"
import { existsSync } from "fs"
import { getSupabaseClient } from "@/lib/supabase"
import { apiError, apiResponse } from "@/lib/data/mock-data"
import { isAllowedProductUrl, parseScraperJson } from "@/lib/import-link-utils"

const execFileAsync = promisify(execFile)

function normalizeProduct(raw: any, url: string) {
  return {
    name: String(raw.name || "").trim(),
    description: String(raw.description || ""),
    category: raw.category || "other",
    source: "link_parse",
    source_url: raw.source_url || url,
    price: raw.price ?? null,
    cost: raw.cost ?? null,
    images: Array.isArray(raw.images) ? raw.images : [],
    specs: raw.specs && typeof raw.specs === "object" ? raw.specs : {},
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    status: "draft",
    risk_level: "safe",
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const url = String(body.url || "").trim()

  if (!isAllowedProductUrl(url)) {
    return apiError("仅支持 1688 公开商品链接，例如 https://detail.1688.com/offer/xxx.html", 400)
  }

  const supabase = await getSupabaseClient()
  if (!supabase) {
    return apiError("Supabase未配置：请在设置页保存 Supabase URL、Anon Key 和 Service Role Key", 503)
  }

  const rootCandidate = path.resolve(process.cwd(), "services", "scraper")
  const appCandidate = path.resolve(process.cwd(), "..", "..", "services", "scraper")
  const scraperCwd = existsSync(path.join(rootCandidate, "main.py")) ? rootCandidate : appCandidate
  const outputPath = path.join(os.tmpdir(), `hermes-parsed-${randomUUID()}.json`)

  try {
    const { stdout } = await execFileAsync(
      "python",
      ["main.py", "parse", "--url", url, "--output", outputPath, "--json"],
      { cwd: scraperCwd, timeout: 60000, maxBuffer: 1024 * 1024 * 5 }
    )

    const parsed = parseScraperJson(stdout)
    const product = normalizeProduct(parsed, url)
    if (!product.name) return apiError("页面解析失败：未提取到商品名称", 422)

    const { data, error } = await supabase.from("products").insert(product).select().single()
    if (error) return apiError(error.message)
    return apiResponse(data, 201)
  } catch (err: any) {
    const detail = err.stderr || err.stdout || err.message || String(err)
    if (detail.includes("playwright")) {
      return apiError("Playwright未安装或浏览器未初始化：请在 services/scraper 下安装依赖并执行 playwright install chromium", 500)
    }
    if (detail.includes("[拦截]")) {
      return apiError("安全拦截：" + detail.slice(0, 300), 400)
    }
    return apiError("链接抓取失败：" + detail.slice(0, 300), 500)
  }
}
