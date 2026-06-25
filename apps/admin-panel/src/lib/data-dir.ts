import { promises as fs } from "fs"
import path from "path"

export function getDataDir() {
  return process.env.DATA_DIR || process.cwd()
}

export async function dataPath(fileName: string) {
  const dir = getDataDir()
  await fs.mkdir(dir, { recursive: true })
  return path.join(dir, fileName)
}
