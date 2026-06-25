import { apiError, apiResponse } from "@/lib/data/mock-data"
import { listPublishRecords, recordPublished } from "@/lib/publish-record-store"

export const dynamic = "force-dynamic"

export async function GET() {
  return apiResponse(await listPublishRecords())
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.product_id && !body.productId) return apiError("product_id is required", 400)
  if (!body.publish_url && !body.publishUrl) return apiError("publish_url is required", 400)

  const record = await recordPublished(body)
  return apiResponse(record, 201)
}
