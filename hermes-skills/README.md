# Hermes Skills — 电商自动化

## 已沉淀 Skills

| Skill | 说明 | 文件 |
|-------|------|------|
| ecommerce-product-import | 产品数据导入（CSV + 链接解析 + 安全过滤） | SKILL.md |
| ecommerce-ai-scoring | AI 多维度产品评分 | SKILL.md |
| ecommerce-content-gen | 小红书/闲鱼文案生成 + 图片Prompt | SKILL.md |
| ecommerce-review | 人工审核队列管理 | SKILL.md |
| ecommerce-recap | 7天数据复盘 | SKILL.md |

## 使用方式

在 Hermes Agent 对话中直接引用：
- "用 ecommerce-product-import 导入这批产品"
- "用 ecommerce-ai-scoring 给这个产品打分"
- "用 ecommerce-content-gen 生成小红书文案"

## Skills 设计原则

- 每个 Skill 自包含，可独立执行
- 安全规则内置于每个 Skill
- 所有输出为 JSON
- 所有危险操作（发布/支付）不包含在内
