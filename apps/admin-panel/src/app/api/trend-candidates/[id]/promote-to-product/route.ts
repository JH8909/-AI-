import { apiError, apiResponse } from "@/lib/data/mock-data"
import { createCachedProduct } from "@/lib/product-cache"
import { buildPromotionProduct, listCandidates, promoteCandidate } from "@/lib/trend-candidates-store"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const candidate = (await listCandidates()).find((item) => item.id === params.id)
    if (!candidate) return apiError("候选商品不存在", 404)
    const product = await createCachedProduct(buildPromotionProduct(candidate))
    const updatedCandidate = await promoteCandidate(params.id)
    return apiResponse({ candidate: updatedCandidate, product }, 201)
  } catch (err: any) {
    return apiError(err.message || "加入产品池失败", 400)
  }
}
