// ============================================
// AI 电商选品中台 — 共享类型定义
// ============================================

// --------------- 枚举 ---------------
export type ProductSource = 'csv_import' | 'link_parse' | 'manual'

export type ProductCategory = 
  | 'fashion' | 'electronics' | 'home' | 'beauty'
  | 'food' | 'sports' | 'toys' | 'books'
  | 'digital' | 'other'

export type Platform = 'xiaohongshu' | 'xianyu'

export type ContentType = 'product_post' | 'review' | 'tutorial'

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'revised' | 'scheduled'
export type ProductStatus =
  | 'draft' | 'testing_candidate' | 'content_ready' | 'review_pending'
  | 'published' | 'tracking' | 'scale' | 'optimize' | 'rejected'

export type RiskLevel = 'safe' | 'warning' | 'blocked'

// --------------- 产品 ---------------
export interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  source: ProductSource
  source_url: string | null
  price: number | null
  cost: number | null
  images: string[]
  specs: Record<string, string>
  tags: string[]
  status: ProductStatus
  risk_level: RiskLevel
  created_at: string
  updated_at: string
}

// --------------- AI 评分 ---------------
export interface ProductScore {
  id: string
  product_id: string
  market_demand: number       // 市场需求度 1-10
  profit_margin: number       // 利润空间 1-10
  competition_intensity: number // 竞争激烈度 1-10 (越低越好)
  compliance_risk: number     // 合规风险 1-10 (越低越好)
  content_fit: number         // 内容适配度 1-10
  overall_score: number       // 综合推荐指数
  reasoning: string           // AI 评分理由
  model_used: string          // 使用的模型
  created_at: string
}

// --------------- 竞品分析 ---------------
export interface CompetitorAnalysis {
  id: string
  product_id: string
  competitor_products: CompetitorProduct[]
  price_comparison: string
  differentiation: string
  content_strategy: string
  overall_report: string
  model_used: string
  created_at: string
}

export interface CompetitorProduct {
  name: string
  price: number
  platform: string
  url: string
  strengths: string[]
  weaknesses: string[]
}

// --------------- 内容草稿 ---------------
export interface ContentDraft {
  id: string
  product_id: string
  platform: Platform
  content_type: ContentType
  title: string
  body: string
  hashtags: string[]
  price_suggestion: number | null
  image_prompt: string | null
  status: ReviewStatus
  review_comment: string | null
  model_used: string
  created_at: string
  updated_at: string
}

// --------------- 审核队列 ---------------
export interface ReviewItem {
  id: string
  content_draft_id: string
  reviewer_id: string | null
  status: ReviewStatus
  comment: string | null
  reviewed_at: string | null
  created_at: string
}

// --------------- 数据快照 ---------------
export interface DataSnapshot {
  id: string
  product_id: string
  snapshot_date: string
  views: number
  likes: number
  shares: number
  sales_estimate: number
  raw_data: Record<string, unknown>
  created_at: string
}

// --------------- API 请求/响应 ---------------
export interface CreateProductRequest {
  name: string
  description: string
  category: ProductCategory
  source_url?: string
  price?: number
  cost?: number
  images?: string[]
  specs?: Record<string, string>
  tags?: string[]
}

export interface ScoreProductRequest {
  product_id: string
  model?: string
}

export interface AnalyzeCompetitorsRequest {
  product_id: string
  competitor_urls: string[]
  model?: string
}

export interface GenerateContentRequest {
  product_id: string
  platform: Platform
  model?: string
}

export interface ReviewContentRequest {
  review_item_id: string
  status: ReviewStatus
  comment?: string
}

export interface LLMResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  model: string
  tokens_used: number
}
