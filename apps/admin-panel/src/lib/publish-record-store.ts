import { dataPath } from "@/lib/data-dir"
import { queryOne, queryRows } from "@/lib/postgres"
import { promises as fs } from "fs"
import { randomUUID } from "crypto"
import { buildPendingPublishRecord, buildPublishedRecord, isPublishRecord, mergePublishRecord } from "@/lib/publish-records-utils"

const CACHE_FILE = ".publish-records-cache.json"

async function readCache(): Promise<any[]> {
  try {
    const rows = JSON.parse(await fs.readFile(await dataPath(CACHE_FILE), "utf-8"))
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

async function writeCache(rows: any[]) {
  try {
    await fs.writeFile(await dataPath(CACHE_FILE), JSON.stringify(rows, null, 2), "utf-8")
  } catch {}
}

async function createCachedPendingPublishRecord(item: any) {
  const record = {
    id: randomUUID(),
    ...buildPendingPublishRecord(item),
    created_at: new Date().toISOString(),
  }
  const rows = mergePublishRecord(await readCache(), record)
  await writeCache(rows.slice(0, 500))
  return rows.find((row) => row.id === record.id || row.content_draft_id === record.content_draft_id) || record
}

async function writePublishedRecordToCache(item: any) {
  const record = {
    id: item.id || randomUUID(),
    ...buildPublishedRecord(item),
    created_at: item.created_at || new Date().toISOString(),
  }
  const rows = mergePublishRecord(await readCache(), record)
  await writeCache(rows.slice(0, 500))
  return rows.find((row) => row.id === record.id || row.content_draft_id === record.content_draft_id) || record
}

export async function readCachedPublishRecords() {
  return (await readCache()).filter(isPublishRecord)
}

export async function createPendingPublishRecord(item: any) {
  const record = buildPendingPublishRecord(item)

  try {
    if (!record.product_id) throw new Error("product_id is required")
    const existing = await queryOne(
      `SELECT *
       FROM publishing_records
       WHERE product_id = $1 AND platform = $2 AND title = $3 AND status = 'pending_publish'
       ORDER BY created_at DESC
       LIMIT 1`,
      [record.product_id, record.platform, record.title],
    )
    if (existing) return existing

    const data = await queryOne(
      `INSERT INTO publishing_records (
        product_id, platform, publish_url, publish_time, title, content, status
      ) VALUES ($1,$2,$3,NULL,$4,$5,'pending_publish')
      RETURNING *`,
      [record.product_id, record.platform, record.publish_url, record.title, record.body],
    )
    if (data) return data
  } catch {}

  return createCachedPendingPublishRecord(item)
}

export async function listPublishRecords() {
  try {
    return await queryRows(
      `SELECT *
       FROM publishing_records
       ORDER BY created_at DESC`,
    )
  } catch {
    return readCachedPublishRecords()
  }
}

export async function recordPublished(item: any) {
  const record = buildPublishedRecord(item)

  try {
    if (!record.product_id) throw new Error("product_id is required")
    const existing = await queryOne(
      `SELECT *
       FROM publishing_records
       WHERE product_id = $1 AND platform = $2 AND status = 'pending_publish'
       ORDER BY created_at DESC
       LIMIT 1`,
      [record.product_id, record.platform],
    )

    if (existing) {
      const updated = await queryOne(
        `UPDATE publishing_records
         SET publish_url = $2, publish_time = $3, title = COALESCE(NULLIF($4, ''), title), content = COALESCE(NULLIF($5, ''), content), status = 'published'
         WHERE id = $1
         RETURNING *`,
        [existing.id, record.publish_url, record.publish_time, record.title, record.body],
      )
      if (updated) return updated
    }

    const data = await queryOne(
      `INSERT INTO publishing_records (
        product_id, platform, publish_url, publish_time, title, content, status
      ) VALUES ($1,$2,$3,$4,$5,$6,'published')
      RETURNING *`,
      [record.product_id, record.platform, record.publish_url, record.publish_time, record.title, record.body],
    )
    if (data) return data
  } catch {}

  return writePublishedRecordToCache(item)
}
