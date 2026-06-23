-- ============================================
-- Seed Data — 示例数据
-- ============================================

-- 示例产品
INSERT INTO products (name, description, category, source, source_url, price, cost, images, specs, tags, status) VALUES
(
  '极简风桌面手机支架',
  '铝合金材质，可折叠便携，支持多角度调节，适用于直播/办公/追剧场景',
  'home',
  'csv_import',
  'https://detail.1688.com/offer/123456.html',
  29.90,
  12.00,
  ARRAY['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  '{"material": "铝合金", "weight": "150g", "foldable": true}',
  ARRAY['手机支架', '桌面', '极简', '办公'],
  'active'
),
(
  '无线蓝牙降噪耳机 Pro',
  'ANC主动降噪，40小时续航，低延迟游戏模式，IPX5防水',
  'electronics',
  'link_parse',
  'https://detail.1688.com/offer/789012.html',
  199.00,
  85.00,
  ARRAY['https://example.com/earphone1.jpg'],
  '{"battery": "40h", "anc": true, "waterproof": "IPX5"}',
  ARRAY['蓝牙耳机', '降噪', '无线'],
  'active'
),
(
  'ins风陶瓷咖啡杯套装',
  '手工陶瓷，200ml容量，含杯+碟+勺，北欧简约设计',
  'home',
  'manual',
  NULL,
  49.90,
  18.00,
  ARRAY['https://example.com/cup1.jpg'],
  '{"capacity": "200ml", "material": "陶瓷", "set": "杯+碟+勺"}',
  ARRAY['咖啡杯', 'ins风', '陶瓷', '北欧'],
  'draft'
);

-- 示例敏感词
INSERT INTO risk_keywords (keyword, category, action) VALUES
  ('Nike', 'counterfeit', 'warn'),
  ('Adidas', 'counterfeit', 'warn'),
  ('减肥药', 'weight_loss', 'block'),
  ('瘦身', 'weight_loss', 'warn'),
  ('保健品', 'supplement', 'block'),
  ('医疗器械', 'medical', 'block'),
  ('三无', 'unlicensed', 'block'),
  ('原单', 'counterfeit', 'warn'),
  ('复刻', 'counterfeit', 'block'),
  ('仿牌', 'counterfeit', 'block');
