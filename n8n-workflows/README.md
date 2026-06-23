# n8n Workflows

## 工作流列表

| 文件 | 触发方式 | 说明 |
|------|----------|------|
| product-import.json | Webhook POST | 产品导入：接收CSV数据 → 调用清洗API → 写入Supabase |
| ai-scoring.json | Webhook POST | AI评分：接收产品ID → 调用AI评分API → 保存评分 |
| competitor-analysis.json | Webhook POST | 竞品分析：接收产品ID+竞品链接 → AI分析 → 保存报告 |
| content-generation.json | Webhook POST | 内容生成：接收产品ID → AI生成文案 → 保存草稿 → 加入审核队列 |
| review-pipeline.json | 定时(每小时) | 审核提醒：查询待审核内容 → 飞书通知 |
| daily-snapshot.json | 定时(每日0点) | 数据快照：遍历活跃产品 → 写入每日快照 |
| weekly-recap.json | 定时(每周一) | 7天复盘：查询7天数据 → AI分析 → 生成复盘报告 |

## 导入方式

1. 打开 n8n 管理界面
2. 点击右上角 "Import from File"
3. 选择对应的 JSON 文件
4. 修改环境变量配置（Supabase凭证、API URL等）
5. 激活工作流

## 环境变量

需要在 n8n 中配置以下环境变量:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_API_KEY=your-service-role-key
AI_API_URL=http://localhost:3000
SCRAPER_URL=http://localhost:8000
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
```

## 安全设计

- 所有 Webhook 触发的工作流仅接收内部请求
- 内容生成后自动加入审核队列，不会自动发布
- 定时任务仅做数据采集和通知，不做发布操作
