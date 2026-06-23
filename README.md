# AI 电商选品中台

> 面向电商运营人员的 AI 驱动选品决策平台

## 技术栈

- **后台面板**: Next.js 14 + TypeScript + Shadcn/ui
- **数据库**: Supabase (PostgreSQL)
- **自动采集**: Python + Playwright
- **自动化流程**: n8n
- **AI 分析**: 统一 LLM Provider Adapter (DeepSeek / GPT / Claude)

## 快速开始

\`\`\`bash
# 安装依赖
npm install

# 启动开发环境
npm run dev
\`\`\`

## 项目结构

\`\`\`
apps/admin-panel/          # Next.js 后台面板
packages/shared-types/     # 共享类型定义
packages/supabase-schema/  # 数据库 Schema
packages/llm-adapter/      # LLM Provider Adapter
services/scraper/          # Python 采集脚本
services/ai-analysis/      # AI 分析 API
services/content-generator/# 内容生成服务
n8n-workflows/             # n8n 工作流
hermes-skills/             # Hermes Skills
\`\`\`

## 安全规范

- 所有 AI 输出必须为 JSON
- 所有危险操作必须进入人工审核
- 不允许自动发布到任何平台
