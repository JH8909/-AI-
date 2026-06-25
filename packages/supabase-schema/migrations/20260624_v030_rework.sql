
-- ============================================
-- v0.3.0 新增表 & 变更
-- ============================================

-- 发布记录表
CREATE TABLE IF NOT EXISTS publishing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'xiaohongshu',
  publish_url TEXT,
  publish_time TIMESTAMPTZ,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_publishing_records_product ON publishing_records(product_id);

-- 扩展 products 表的状态枚举
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
  CHECK (status IN ('draft','testing_candidate','content_ready','review_pending',
         'published','tracking','scale','optimize','rejected'));

-- 扩展 product_scores 表 (7维)
ALTER TABLE product_scores ADD COLUMN IF NOT EXISTS supply_chain_stability INTEGER CHECK (supply_chain_stability BETWEEN 1 AND 10);
ALTER TABLE product_scores ADD COLUMN IF NOT EXISTS visual_packaging INTEGER CHECK (visual_packaging BETWEEN 1 AND 10);

-- 扩展 data_snapshots (daily_metrics 扩字段)
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS dms INTEGER DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS consultations INTEGER DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS deals INTEGER DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS revenue NUMERIC(10,2) DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS profit NUMERIC(10,2) DEFAULT 0;
ALTER TABLE data_snapshots ADD COLUMN IF NOT EXISTS refunds INTEGER DEFAULT 0;

-- 增强 review_queue
ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS is_high_risk BOOLEAN DEFAULT false;
ALTER TABLE review_queue ALTER COLUMN reviewer_id DROP NOT NULL;

ALTER TABLE content_drafts DROP CONSTRAINT IF EXISTS content_drafts_status_check;
ALTER TABLE content_drafts ADD CONSTRAINT content_drafts_status_check
  CHECK (status IN ('pending','approved','rejected','revised','scheduled'));
