-- Tencent Cloud Lighthouse PostgreSQL schema for the ecommerce AI app.
-- Run as the app database owner:
-- psql "$DATABASE_URL" -f scripts/tencent-cloud-postgres-schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  external_id TEXT,
  source_keyword TEXT,
  price NUMERIC(10,2),
  cost NUMERIC(10,2),
  images TEXT[] DEFAULT '{}',
  specs JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  risk_level TEXT NOT NULL DEFAULT 'safe',
  radar_state TEXT NOT NULL DEFAULT 'selected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_risk_level ON products(risk_level);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);

CREATE TABLE IF NOT EXISTS product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  market_demand INTEGER NOT NULL CHECK (market_demand BETWEEN 1 AND 10),
  profit_margin INTEGER NOT NULL CHECK (profit_margin BETWEEN 1 AND 10),
  competition_intensity INTEGER NOT NULL CHECK (competition_intensity BETWEEN 1 AND 10),
  compliance_risk INTEGER NOT NULL CHECK (compliance_risk BETWEEN 1 AND 10),
  content_fit INTEGER NOT NULL CHECK (content_fit BETWEEN 1 AND 10),
  supply_chain_stability INTEGER CHECK (supply_chain_stability BETWEEN 1 AND 10),
  visual_packaging INTEGER CHECK (visual_packaging BETWEEN 1 AND 10),
  overall_score NUMERIC(4,2) NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  model_used TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_scores_product ON product_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_product_scores_overall ON product_scores(overall_score DESC);

CREATE TABLE IF NOT EXISTS competitor_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  competitor_products JSONB NOT NULL DEFAULT '[]',
  price_comparison TEXT DEFAULT '',
  differentiation TEXT DEFAULT '',
  content_strategy TEXT DEFAULT '',
  overall_report TEXT DEFAULT '',
  model_used TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'xiaohongshu',
  content_type TEXT NOT NULL DEFAULT 'product_post',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  price_suggestion NUMERIC(10,2),
  image_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  review_comment TEXT,
  model_used TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_content_drafts_updated_at ON content_drafts;
CREATE TRIGGER trg_content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_content_drafts_product ON content_drafts(product_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_content_drafts_platform ON content_drafts(platform);

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_draft_id UUID NOT NULL REFERENCES content_drafts(id) ON DELETE CASCADE,
  reviewer_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  checklist JSONB DEFAULT '[]',
  is_high_risk BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_content ON review_queue(content_draft_id);

CREATE TABLE IF NOT EXISTS data_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  sales_estimate INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  dms INTEGER DEFAULT 0,
  consultations INTEGER DEFAULT 0,
  deals INTEGER DEFAULT 0,
  revenue NUMERIC(10,2) DEFAULT 0,
  profit NUMERIC(10,2) DEFAULT 0,
  refunds INTEGER DEFAULT 0,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_data_snapshots_product ON data_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_data_snapshots_date ON data_snapshots(snapshot_date DESC);

CREATE TABLE IF NOT EXISTS publishing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'xiaohongshu',
  publish_url TEXT,
  publish_time TIMESTAMPTZ,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitor_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('seed', 'expanded')),
  parent_id UUID REFERENCES monitor_keywords(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES monitor_keywords(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processed_count INTEGER NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(keyword_id, cycle_at)
);

CREATE TABLE IF NOT EXISTS product_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  crawl_job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  keyword TEXT NOT NULL,
  search_rank INTEGER CHECK (search_rank IS NULL OR search_rank > 0),
  price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
  minimum_order INTEGER CHECK (minimum_order IS NULL OR minimum_order >= 0),
  supplier_signals JSONB NOT NULL DEFAULT '{}',
  raw_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, crawl_job_id)
);

CREATE TABLE IF NOT EXISTS hot_product_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rank INTEGER NOT NULL CHECK (rank > 0),
  overall_score NUMERIC(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  dimensions JSONB NOT NULL DEFAULT '{}',
  xiaohongshu_price NUMERIC(10,2),
  xianyu_price NUMERIC(10,2),
  explanation TEXT NOT NULL DEFAULT '',
  channel_advice JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, score_date),
  UNIQUE(score_date, rank)
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_claim ON crawl_jobs(status, cycle_at, created_at);
CREATE INDEX IF NOT EXISTS idx_observations_product_time ON product_observations(product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_scores_date_rank ON hot_product_scores(score_date DESC, rank);

CREATE TABLE IF NOT EXISTS trend_candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  original_title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  heat NUMERIC(8,2) NOT NULL DEFAULT 0,
  growth NUMERIC(8,2) NOT NULL DEFAULT 0,
  price_band TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  content_scene TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  keywords TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  risk_level TEXT NOT NULL DEFAULT 'safe',
  supply JSONB,
  score JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trend_candidates_status ON trend_candidates(status);
CREATE INDEX IF NOT EXISTS idx_trend_candidates_score ON trend_candidates(((score->>'total')::numeric) DESC) WHERE score IS NOT NULL;

CREATE OR REPLACE FUNCTION claim_crawl_job(worker_name TEXT)
RETURNS SETOF crawl_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  claimed_id UUID;
BEGIN
  SELECT id INTO claimed_id
  FROM crawl_jobs
  WHERE status = 'pending'
     OR (status = 'running' AND locked_at < NOW() - INTERVAL '10 minutes')
  ORDER BY cycle_at, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE crawl_jobs
  SET status = 'running',
      locked_by = worker_name,
      locked_at = NOW(),
      attempt_count = attempt_count + 1,
      error = NULL
  WHERE id = claimed_id
  RETURNING *;
END;
$$;
