-- ============================================
-- AI 电商选品中台 — Supabase Schema v0.1.0
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 产品主表
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN (
    'fashion', 'electronics', 'home', 'beauty',
    'food', 'sports', 'toys', 'books', 'digital', 'other'
  )),
  source TEXT NOT NULL CHECK (source IN ('csv_import', 'link_parse', 'manual')),
  source_url TEXT,
  price NUMERIC(10,2),
  cost NUMERIC(10,2),
  images TEXT[] DEFAULT '{}',
  specs JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  risk_level TEXT NOT NULL DEFAULT 'safe' CHECK (risk_level IN ('safe', 'warning', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_risk_level ON products(risk_level);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- updated_at 自动更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. AI 产品评分表
-- ============================================
CREATE TABLE product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  market_demand INTEGER NOT NULL CHECK (market_demand BETWEEN 1 AND 10),
  profit_margin INTEGER NOT NULL CHECK (profit_margin BETWEEN 1 AND 10),
  competition_intensity INTEGER NOT NULL CHECK (competition_intensity BETWEEN 1 AND 10),
  compliance_risk INTEGER NOT NULL CHECK (compliance_risk BETWEEN 1 AND 10),
  content_fit INTEGER NOT NULL CHECK (content_fit BETWEEN 1 AND 10),
  overall_score NUMERIC(4,2) NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  model_used TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_scores_product ON product_scores(product_id);
CREATE INDEX idx_product_scores_overall ON product_scores(overall_score DESC);

-- ============================================
-- 3. 竞品分析表
-- ============================================
CREATE TABLE competitor_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  competitor_products JSONB NOT NULL DEFAULT '[]',
  price_comparison TEXT DEFAULT '',
  differentiation TEXT DEFAULT '',
  content_strategy TEXT DEFAULT '',
  overall_report TEXT DEFAULT '',
  model_used TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitor_analyses_product ON competitor_analyses(product_id);

-- ============================================
-- 4. 内容草稿表
-- ============================================
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('xiaohongshu', 'xianyu')),
  content_type TEXT NOT NULL DEFAULT 'product_post' CHECK (content_type IN ('product_post', 'review', 'tutorial')),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  price_suggestion NUMERIC(10,2),
  image_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revised')),
  review_comment TEXT,
  model_used TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_drafts_product ON content_drafts(product_id);
CREATE INDEX idx_content_drafts_status ON content_drafts(status);
CREATE INDEX idx_content_drafts_platform ON content_drafts(platform);

CREATE TRIGGER trg_content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. 审核队列表
-- ============================================
CREATE TABLE review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_draft_id UUID NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  reviewer_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_content ON review_queue(content_draft_id);

-- ============================================
-- 6. 数据快照表（7天复盘）
-- ============================================
CREATE TABLE data_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  sales_estimate INTEGER DEFAULT 0,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, snapshot_date)
);

CREATE INDEX idx_data_snapshots_product ON data_snapshots(product_id);
CREATE INDEX idx_data_snapshots_date ON data_snapshots(snapshot_date DESC);

-- ============================================
-- 7. 操作审计日志
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changes JSONB DEFAULT '{}',
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);

-- ============================================
-- 8. 敏感词库
-- ============================================
CREATE TABLE risk_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('counterfeit', 'medical', 'weight_loss', 'supplement', 'unlicensed')),
  action TEXT NOT NULL DEFAULT 'block' CHECK (action IN ('warn', 'block')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_keywords_keyword ON risk_keywords(keyword);

-- ============================================
-- RLS (Row Level Security) — 基础策略
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_keywords ENABLE ROW LEVEL SECURITY;

-- 基础策略：认证用户可读所有表
CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read scores"
  ON product_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read analyses"
  ON competitor_analyses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read drafts"
  ON content_drafts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read review queue"
  ON review_queue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read snapshots"
  ON data_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read keywords"
  ON risk_keywords FOR SELECT TO authenticated USING (true);

-- 写入策略：认证用户可 INSERT
CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert scores"
  ON product_scores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert analyses"
  ON competitor_analyses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert drafts"
  ON content_drafts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert review items"
  ON review_queue FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert snapshots"
  ON data_snapshots FOR INSERT TO authenticated WITH CHECK (true);

-- 审核队列特殊策略：审核员可 UPDATE
CREATE POLICY "Reviewers can update review queue"
  ON review_queue FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can update drafts status"
  ON content_drafts FOR UPDATE TO authenticated
  USING (true);
