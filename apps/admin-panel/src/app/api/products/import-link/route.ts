import { apiError, apiResponse } from "@/lib/data/mock-data"
import {
  createScraperProcessEnv,
  hasRequired1688ProductEvidence,
  isAllowedProductUrl,
  normalizeImportedProduct,
  parseScraperJson,
} from "@/lib/import-link-utils"
import { spawn } from "child_process"
import { existsSync } from "fs"
import path from "path"

function resolveScraperDir() {
  const candidates = [
    path.resolve(process.cwd(), "services", "scraper"),
    path.resolve(process.cwd(), "..", "..", "services", "scraper"),
  ]
  return candidates.find((dir) => existsSync(path.join(dir, "main.py"))) || candidates[0]
}

async function runScraper(url: string, timeoutMs = 8000) {
  const scraperDir = resolveScraperDir()
  return new Promise<string>((resolve, reject) => {
    const child = spawn("python", ["main.py", "parse", "--url", url, "--json"], {
      cwd: scraperDir,
      env: createScraperProcessEnv(process.env),
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error("1688 页面采集超时，请稍后重试或手动补充供货信息"))
    }, timeoutMs)

    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf-8") })
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf-8") })
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `采集进程退出，代码 ${code}`))
    })
  })
}

async function parseWithScraper(url: string) {
  const raw = parseScraperJson(await runScraper(url))
  if (!hasRequired1688ProductEvidence(raw)) {
    throw new Error("未提取到完整 1688 商品名和价格，不能视为成功导入")
  }
  return normalizeImportedProduct(raw, url)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const url = String(body.url || "").trim()
    if (!isAllowedProductUrl(url)) return apiError("请输入公开的 1688 商品详情链接，例如 https://detail.1688.com/offer/123.html", 400)

    return apiResponse(await parseWithScraper(url))
  } catch (err: any) {
    return apiError(err.message || "解析失败", 422)
  }
}
