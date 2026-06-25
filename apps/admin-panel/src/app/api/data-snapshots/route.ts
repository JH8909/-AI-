import { apiResponse } from "@/lib/data/mock-data"
import { queryOne, queryRows } from "@/lib/postgres"

let _nextId = 100
const _store: Record<string, any[]> = {}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get("product_id") || ""

  try {
    const data = await queryRows(
      "SELECT * FROM data_snapshots WHERE product_id = $1 ORDER BY snapshot_date",
      [productId],
    )
    return apiResponse(data)
  } catch {}

  if (_store[productId] && _store[productId].length > 0) return apiResponse(_store[productId])
  return apiResponse([])
}

export async function POST(req: Request) {
  const body = await req.json()
  const pid = body.product_id || ""

  try {
    const data = await queryOne(
      `INSERT INTO data_snapshots (
        product_id, snapshot_date, views, likes, shares, sales_estimate, favorites, comments,
        dms, consultations, deals, revenue, profit, refunds, raw_data
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (product_id, snapshot_date) DO UPDATE SET
        views = EXCLUDED.views,
        likes = EXCLUDED.likes,
        shares = EXCLUDED.shares,
        sales_estimate = EXCLUDED.sales_estimate,
        favorites = EXCLUDED.favorites,
        comments = EXCLUDED.comments,
        dms = EXCLUDED.dms,
        consultations = EXCLUDED.consultations,
        deals = EXCLUDED.deals,
        revenue = EXCLUDED.revenue,
        profit = EXCLUDED.profit,
        refunds = EXCLUDED.refunds,
        raw_data = EXCLUDED.raw_data
      RETURNING *`,
      [
        pid,
        body.snapshot_date,
        body.views || 0,
        body.likes || 0,
        body.shares || 0,
        body.sales_estimate || body.sales || 0,
        body.favorites || 0,
        body.comments || 0,
        body.dms || 0,
        body.consultations || 0,
        body.deals || 0,
        body.revenue || 0,
        body.profit || 0,
        body.refunds || 0,
        body.raw_data || {},
      ],
    )
    if (data) return apiResponse(data, 201)
  } catch {}

  if (!_store[pid]) _store[pid] = []
  const existing = _store[pid].findIndex((s: any) => s.snapshot_date === body.snapshot_date)
  const entry = { id: ++_nextId, ...body, created_at: new Date().toISOString() }
  if (existing >= 0) _store[pid][existing] = entry
  else _store[pid].push(entry)
  return apiResponse(entry, 201)
}
