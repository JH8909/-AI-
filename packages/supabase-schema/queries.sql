-- ============================================
-- 常用查询示例
-- ============================================

-- 1. 获取待审核内容
SELECT
  cd.id,
  cd.title,
  cd.platform,
  cd.status,
  p.name AS product_name,
  cd.created_at
FROM content_drafts cd
JOIN products p ON cd.product_id = p.id
WHERE cd.status = 'pending'
ORDER BY cd.created_at DESC;

-- 2. 产品评分排行榜
SELECT
  p.name,
  p.category,
  ps.overall_score,
  ps.market_demand,
  ps.profit_margin,
  ps.reasoning
FROM product_scores ps
JOIN products p ON ps.product_id = p.id
WHERE ps.overall_score >= 7.0
ORDER BY ps.overall_score DESC
LIMIT 20;

-- 3. 7天复盘数据
SELECT
  p.name,
  ds.snapshot_date,
  ds.views,
  ds.likes,
  ds.shares,
  ds.sales_estimate
FROM data_snapshots ds
JOIN products p ON ds.product_id = p.id
WHERE ds.snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ds.snapshot_date DESC;

-- 4. 内容草稿统计
SELECT
  platform,
  status,
  COUNT(*) AS count
FROM content_drafts
GROUP BY platform, status
ORDER BY platform, status;

-- 5. 高风险产品列表
SELECT name, category, risk_level, description
FROM products
WHERE risk_level IN ('warning', 'blocked')
ORDER BY risk_level, created_at DESC;
