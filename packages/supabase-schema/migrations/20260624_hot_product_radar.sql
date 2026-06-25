-- 1688 Hot Product Radar additive migration.
-- Run schema.sql before this migration. Service-role REST credentials cannot create tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS radar_state TEXT NOT NULL DEFAULT 'selected',
  ADD COLUMN IF NOT EXISTS source_keyword TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_radar_state_check'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_radar_state_check
      CHECK (radar_state IN ('candidate', 'selected', 'ignored'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_products_1688_external_id'
      AND indexdef ILIKE '%WHERE%'
  ) THEN
    DROP INDEX public.idx_products_1688_external_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_1688_external_id
  ON public.products(external_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Authenticated users can insert products'
  ) THEN
    EXECUTE $policy$
      ALTER POLICY "Authenticated users can insert products"
      ON public.products
      TO authenticated
      WITH CHECK (
        radar_state = 'selected'
        AND external_id IS NULL
        AND source_keyword IS NULL
      )
    $policy$;
  ELSE
    CREATE POLICY "Authenticated users can insert products"
      ON public.products
      FOR INSERT
      TO authenticated
      WITH CHECK (
        radar_state = 'selected'
        AND external_id IS NULL
        AND source_keyword IS NULL
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS monitor_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('seed', 'expanded')),
  parent_id UUID REFERENCES monitor_keywords(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(keyword)
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id UUID NOT NULL REFERENCES monitor_keywords(id) ON DELETE CASCADE,
  cycle_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'paused')),
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
  dimensions JSONB NOT NULL,
  xiaohongshu_price NUMERIC(10,2) CHECK (xiaohongshu_price IS NULL OR xiaohongshu_price >= 0),
  xianyu_price NUMERIC(10,2) CHECK (xianyu_price IS NULL OR xianyu_price >= 0),
  explanation TEXT NOT NULL DEFAULT '',
  channel_advice JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, score_date),
  UNIQUE(score_date, rank)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('wecom', 'feishu')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(score_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_claim
  ON crawl_jobs(status, cycle_at, created_at);
CREATE INDEX IF NOT EXISTS idx_observations_product_time
  ON product_observations(product_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_scores_date_rank
  ON hot_product_scores(score_date DESC, rank);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'monitor_keywords_consecutive_failures_nonnegative_check'
      AND conrelid = 'public.monitor_keywords'::regclass
  ) THEN
    ALTER TABLE public.monitor_keywords
      ADD CONSTRAINT monitor_keywords_consecutive_failures_nonnegative_check
      CHECK (consecutive_failures >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crawl_jobs_attempt_count_nonnegative_check'
      AND conrelid = 'public.crawl_jobs'::regclass
  ) THEN
    ALTER TABLE public.crawl_jobs
      ADD CONSTRAINT crawl_jobs_attempt_count_nonnegative_check
      CHECK (attempt_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crawl_jobs_processed_count_nonnegative_check'
      AND conrelid = 'public.crawl_jobs'::regclass
  ) THEN
    ALTER TABLE public.crawl_jobs
      ADD CONSTRAINT crawl_jobs_processed_count_nonnegative_check
      CHECK (processed_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crawl_jobs_failed_count_nonnegative_check'
      AND conrelid = 'public.crawl_jobs'::regclass
  ) THEN
    ALTER TABLE public.crawl_jobs
      ADD CONSTRAINT crawl_jobs_failed_count_nonnegative_check
      CHECK (failed_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_observations_search_rank_positive_check'
      AND conrelid = 'public.product_observations'::regclass
  ) THEN
    ALTER TABLE public.product_observations
      ADD CONSTRAINT product_observations_search_rank_positive_check
      CHECK (search_rank IS NULL OR search_rank > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_observations_price_nonnegative_check'
      AND conrelid = 'public.product_observations'::regclass
  ) THEN
    ALTER TABLE public.product_observations
      ADD CONSTRAINT product_observations_price_nonnegative_check
      CHECK (price IS NULL OR price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_observations_minimum_order_nonnegative_check'
      AND conrelid = 'public.product_observations'::regclass
  ) THEN
    ALTER TABLE public.product_observations
      ADD CONSTRAINT product_observations_minimum_order_nonnegative_check
      CHECK (minimum_order IS NULL OR minimum_order >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hot_product_scores_rank_positive_check'
      AND conrelid = 'public.hot_product_scores'::regclass
  ) THEN
    ALTER TABLE public.hot_product_scores
      ADD CONSTRAINT hot_product_scores_rank_positive_check
      CHECK (rank > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hot_product_scores_overall_score_range_check'
      AND conrelid = 'public.hot_product_scores'::regclass
  ) THEN
    ALTER TABLE public.hot_product_scores
      ADD CONSTRAINT hot_product_scores_overall_score_range_check
      CHECK (overall_score >= 0 AND overall_score <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hot_product_scores_xiaohongshu_price_nonnegative_check'
      AND conrelid = 'public.hot_product_scores'::regclass
  ) THEN
    ALTER TABLE public.hot_product_scores
      ADD CONSTRAINT hot_product_scores_xiaohongshu_price_nonnegative_check
      CHECK (xiaohongshu_price IS NULL OR xiaohongshu_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hot_product_scores_xianyu_price_nonnegative_check'
      AND conrelid = 'public.hot_product_scores'::regclass
  ) THEN
    ALTER TABLE public.hot_product_scores
      ADD CONSTRAINT hot_product_scores_xianyu_price_nonnegative_check
      CHECK (xianyu_price IS NULL OR xianyu_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_deliveries_attempt_count_nonnegative_check'
      AND conrelid = 'public.notification_deliveries'::regclass
  ) THEN
    ALTER TABLE public.notification_deliveries
      ADD CONSTRAINT notification_deliveries_attempt_count_nonnegative_check
      CHECK (attempt_count >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.claim_crawl_job(worker_name TEXT)
RETURNS SETOF public.crawl_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_id UUID;
BEGIN
  SELECT id INTO claimed_id
  FROM public.crawl_jobs
  WHERE status = 'pending'
     OR (status = 'running' AND locked_at < NOW() - INTERVAL '10 minutes')
  ORDER BY cycle_at, created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.crawl_jobs
  SET status = 'running',
      locked_by = worker_name,
      locked_at = NOW(),
      attempt_count = attempt_count + 1,
      error = NULL
  WHERE id = claimed_id
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_hot_product_scores(score_day DATE, score_rows JSONB)
RETURNS SETOF public.hot_product_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.hot_product_scores
  WHERE score_date = score_day;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.hot_product_scores (
      product_id,
      score_date,
      rank,
      overall_score,
      confidence,
      dimensions,
      xiaohongshu_price,
      xianyu_price,
      explanation,
      channel_advice
    )
    SELECT
      input.product_id,
      score_day,
      input.rank,
      input.overall_score,
      input.confidence,
      COALESCE(input.dimensions, '{}'::jsonb),
      input.xiaohongshu_price,
      input.xianyu_price,
      COALESCE(input.explanation, ''),
      COALESCE(input.channel_advice, '{}'::jsonb)
    FROM jsonb_to_recordset(COALESCE(score_rows, '[]'::jsonb)) AS input(
      product_id UUID,
      rank INTEGER,
      overall_score NUMERIC(5,2),
      confidence TEXT,
      dimensions JSONB,
      xiaohongshu_price NUMERIC(10,2),
      xianyu_price NUMERIC(10,2),
      explanation TEXT,
      channel_advice JSONB
    )
    RETURNING *
  )
  SELECT *
  FROM inserted
  ORDER BY rank;
END;
$$;

ALTER TABLE monitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read monitor keywords" ON monitor_keywords;
CREATE POLICY "Authenticated users can read monitor keywords"
  ON monitor_keywords FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read crawl jobs" ON crawl_jobs;
CREATE POLICY "Authenticated users can read crawl jobs"
  ON crawl_jobs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read product observations" ON product_observations;
CREATE POLICY "Authenticated users can read product observations"
  ON product_observations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read hot product scores" ON hot_product_scores;
CREATE POLICY "Authenticated users can read hot product scores"
  ON hot_product_scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read notification deliveries" ON notification_deliveries;
CREATE POLICY "Authenticated users can read notification deliveries"
  ON notification_deliveries FOR SELECT TO authenticated USING (true);

REVOKE ALL ON FUNCTION public.claim_crawl_job(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_crawl_job(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.replace_hot_product_scores(DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_hot_product_scores(DATE, JSONB) TO service_role;
