# Supabase Schema

## 表结构

| 表名 | 说明 | 行数限制 |
|------|------|----------|
| products | 产品主表 | - |
| product_scores | AI评分记录 | 每产品多条 |
| competitor_analyses | 竞品分析 | 每产品多条 |
| content_drafts | 内容草稿 | 每产品多条 |
| review_queue | 审核队列 | 每草稿一条 |
| data_snapshots | 数据快照 | 每产品每天一条 |
| audit_logs | 操作审计 | 自动记录 |
| risk_keywords | 敏感词库 | 预设+可扩展 |

## 初始化

### 方式1: Supabase Dashboard SQL Editor
1. 登录 Supabase Dashboard
2. 打开 SQL Editor
3. 依次执行: schema.sql → seed.sql

### 方式2: Supabase CLI
```bash
supabase db push
```

## RLS 安全策略

所有表已启用 RLS：
- SELECT: 所有认证用户可读
- INSERT: 所有认证用户可写
- UPDATE: 审核员可更新审核队列和草稿状态
- DELETE: 暂不开放（软删除用 status='archived'）

## 数据模型图

```
products (1) ──< product_scores (N)
products (1) ──< competitor_analyses (N)
products (1) ──< content_drafts (N)
products (1) ──< data_snapshots (N)
content_drafts (1) ──< review_queue (N)
```
