# Admin Panel (Next.js 14)

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| / | 仪表盘 | 数据概览 + 最近产品 |
| /products | 产品池 | 产品管理、筛选、CSV导入入口 |
| /competitor-analysis | 竞品分析 | 选择产品 → 添加竞品 → AI分析报告 |
| /ai-scoring | AI评分 | 多维度AI产品评分 |
| /content-drafts | 内容草稿 | 小红书/闲鱼AI文案管理 |
| /review-queue | 审核队列 | 人工审核含风险提示 |
| /data-recap | 7天复盘 | 产品数据追踪 + AI复盘报告 |
| /settings | 设置 | LLM配置 + 安全规则 |

## 开发

```bash
cd apps/admin-panel
npm run dev
# Open http://localhost:3000
```

## 安全设计

- 审核队列中高风险产品用红色警告标记
- 驳回操作必须填写理由
- 设置页明确显示「自动发布已禁用」
- 所有AI生成内容必须通过人工审核
