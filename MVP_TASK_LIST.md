# AI 电商选品中台 — MVP 开发任务清单

> 基于 FUNCTION_DETAIL_SPEC.md 的18个功能模块拆分为可开发任务
> 优先级: P0=必须 P1=重要 P2=锦上添花

## 第一阶段：选品闭环 (P0)

### T1 手动新增产品弹窗
| 项目 | 内容 |
|------|------|
| 关联功能 | F1-1 |
| 开发内容 | 点击"添加产品"打开Modal表单: 名称/描述/分类下拉/价格/成本/标签/链接/图片URL |
| 涉及文件 | apps/admin-panel/src/app/products/page.tsx(新增Modal组件) |
| API变更 | POST /api/products 已存在(仅需确认字段完整) |
| 数据表 | products |
| 工时预估 | 2h |
| 验收标准 | 见F1-1验收标准 |

### T2 CSV导入弹窗+前端解析
| 项目 | 内容 |
|------|------|
| 关联功能 | F1-2 |
| 开发内容 | 拖拽上传区 + 前端CSV解析 + 预览表格 + 统计展示 + 确认导入 |
| 涉及文件 | apps/admin-panel/src/app/products/import-modal.tsx(新文件) |
| API变更 | 调用现有POST /api/products (批量) |
| 数据表 | products |
| 工时预估 | 4h |
| 验收标准 | 见F1-2验收标准 |

### T3 产品去重+清洗后台增强
| 项目 | 内容 |
|------|------|
| 关联功能 | F1-3 |
| 开发内容 | 在POST /api/products中集成去重逻辑(名称模糊匹配) + 处理结果返回 |
| 涉及文件 | services/scraper/cleaner.py + apps/admin-panel/src/app/api/products/route.ts |
| API变更 | POST /api/products 返回值增加 duped 字段 |
| 数据表 | products |
| 工时预估 | 1h |
| 验收标准 | 见F1-3验收标准 |

### T4 AI评分交互优化
| 项目 | 内容 |
|------|------|
| 关联功能 | F1-4 |
| 开发内容 | 评分卡片UI优化 + 评分历史记录 + 重新评分loading状态 + 错误展示 |
| 涉及文件 | apps/admin-panel/src/app/ai-scoring/page.tsx |
| API变更 | 无(现有/api/ai/score已可用) |
| 数据表 | product_scores |
| 工时预估 | 3h |
| 验收标准 | 见F1-4验收标准 |

### T5 竞品分析链接解析增强
| 项目 | 内容 |
|------|------|
| 关联功能 | F1-5 |
| 开发内容 | 竞品URL输入后调用Playwright提取标题/价格 + 分析结果持久化 |
| 涉及文件 | apps/admin-panel/src/app/api/competitor-analysis/route.ts + services/scraper/link_parser.py |
| API变更 | POST /api/ai/analyze 增加竞品URL预处理 |
| 数据表 | competitor_analyses |
| 工时预估 | 3h |
| 验收标准 | 见F1-5验收标准 |

### T6 高分产品->测试池
| 项目 | 内容 |
|------|------|
| 关联功能 | F1-6 |
| 开发内容 | 评分>=7产品显示"加入测试池"按钮 + 点击后状态更新 + 自动创建内容草稿 |
| 涉及文件 | apps/admin-panel/src/app/ai-scoring/page.tsx + /api/products/[id]/route.ts |
| API变更 | PATCH /api/products/[id] (status) + POST /api/content-drafts (自动创建) |
| 数据表 | products, content_drafts |
| 工时预估 | 2h |
| 验收标准 | 见F1-6验收标准 |

## 第二阶段：内容闭环 (P0-P1)

### T7 内容生成选择器(产品+平台)
| 项目 | 内容 |
|------|------|
| 关联功能 | F2-1, F2-2 |
| 开发内容 | "生成内容"点击后弹出选择器: 选择产品(下拉)+选择平台(小红书/闲鱼)+生成按钮 |
| 涉及文件 | apps/admin-panel/src/app/content-drafts/generate-modal.tsx(新文件) |
| API变更 | 调用现有POST /api/ai/generate |
| 数据表 | content_drafts |
| 工时预估 | 3h |
| 验收标准 | 1. 弹窗可选择产品 2. 可选择平台 3. 点击生成调用AI 4. 完成后列表刷新 |

### T8 图片Prompt展示+复制
| 项目 | 内容 |
|------|------|
| 关联功能 | F2-3 |
| 开发内容 | 内容草稿卡片增加"图片Prompt"区块 + 复制按钮 + 重新生成按钮 |
| 涉及文件 | apps/admin-panel/src/app/content-drafts/page.tsx |
| API变更 | 无 |
| 数据表 | content_drafts.image_prompt |
| 工时预估 | 2h |
| 验收标准 | 见F2-3验收标准 |

### T9 合规检查引擎完善
| 项目 | 内容 |
|------|------|
| 关联功能 | F2-4 |
| 开发内容 | 在content_drafts POST时自动执行敏感词检查 + 命中规则自动设置状态/风险等级 |
| 涉及文件 | apps/admin-panel/src/app/api/content-drafts/route.ts + services/scraper/safety.py |
| API变更 | POST /api/content-drafts 返回风险等级 |
| 数据表 | content_drafts.risk_level, review_queue |
| 工时预估 | 2h |
| 验收标准 | 见F2-4验收标准 |

### T10 审核队列PATCH持久化
| 项目 | 内容 |
|------|------|
| 关联功能 | F2-5 |
| 开发内容 | PATCH /api/review-queue 对接Supabase + 失败降级到内存存储 + 审核日志记录 |
| 涉及文件 | apps/admin-panel/src/app/api/review-queue/route.ts |
| API变更 | PATCH /api/review-queue 增强 |
| 数据表 | review_queue, audit_logs |
| 工时预估 | 1h |
| 验收标准 | 见F2-5验收标准 |

### T11 发布排期选择器
| 项目 | 内容 |
|------|------|
| 关联功能 | F2-6 |
| 开发内容 | 已通过内容增加"排期发布"按钮 + 日期时间选择器 + 状态更新 |
| 涉及文件 | apps/admin-panel/src/app/content-drafts/page.tsx + /api/content-drafts/route.ts |
| API变更 | PATCH /api/content-drafts/[id] (status, scheduled_at) |
| 数据表 | content_drafts |
| 工时预估 | 2h |
| 验收标准 | 见F2-6验收标准 |

## 第三阶段：复盘闭环 (P1-P2)

### T12 发布数据录入表单
| 项目 | 内容 |
|------|------|
| 关联功能 | F3-1 |
| 开发内容 | 产品池/产品详情页增加"记录发布数据"按钮 + 表单Modal |
| 涉及文件 | apps/admin-panel/src/app/products/page.tsx + /api/data-snapshots/route.ts |
| API变更 | 新增 POST /api/data-snapshots |
| 数据表 | data_snapshots |
| 工时预估 | 3h |
| 验收标准 | 见F3-1验收标准 |

### T13 每日数据录入表单
| 项目 | 内容 |
|------|------|
| 关联功能 | F3-2 |
| 开发内容 | 已发布产品增加"录入日数据"按钮 + 5个数字输入框 + 日期选择 |
| 涉及文件 | apps/admin-panel/src/app/products/page.tsx |
| API变更 | 复用POST /api/data-snapshots (upsert逻辑) |
| 数据表 | data_snapshots |
| 工时预估 | 3h |
| 验收标准 | 见F3-2验收标准 |

### T14 AI复盘报告增强
| 项目 | 内容 |
|------|------|
| 关联功能 | F3-3 |
| 开发内容 | 复盘报告连接真实LLM + 趋势图表(使用recharts) + 导出PDF按钮 |
| 涉及文件 | apps/admin-panel/src/app/data-recap/page.tsx + /api/ai/recap/route.ts(新) |
| API变更 | 新增 POST /api/ai/recap |
| 数据表 | 无 |
| 工时预估 | 4h |
| 验收标准 | 见F3-3验收标准 |

### T15 AI决策建议
| 项目 | 内容 |
|------|------|
| 关联功能 | F3-4 |
| 开发内容 | 基于复盘数据调用AI生成决策建议 + 3种决策卡片展示 |
| 涉及文件 | apps/admin-panel/src/app/data-recap/page.tsx + /api/ai/decide/route.ts(新) |
| API变更 | 新增 POST /api/ai/decide |
| 数据表 | 无 |
| 工时预估 | 3h |
| 验收标准 | 见F3-4验收标准 |

### T16 产品状态更新流程
| 项目 | 内容 |
|------|------|
| 关联功能 | F3-5 |
| 开发内容 | "应用决策"按钮 -> 确认弹窗 -> 调用PATCH更新产品状态 -> 列表刷新 |
| 涉及文件 | apps/admin-panel/src/app/data-recap/page.tsx |
| API变更 | 复用PATCH /api/products/[id] |
| 数据表 | products |
| 工时预估 | 1h |
| 验收标准 | 见F3-5验收标准 |

### T17 下一步任务生成
| 项目 | 内容 |
|------|------|
| 关联功能 | F3-6 |
| 开发内容 | 决策后自动生成任务列表(预设模板) + checkbox勾选 + 编辑/删除 |
| 涉及文件 | apps/admin-panel/src/app/data-recap/page.tsx + /api/tasks/route.ts(新) |
| API变更 | 新增 CRUD /api/tasks |
| 数据表 | 新表 tasks |
| 工时预估 | 3h |
| 验收标准 | 见F3-6验收标准 |

## 第四阶段：基础建设 (P0)

### T18 Toast通知组件
| 项目 | 内容 |
|------|------|
| 开发内容 | 全局Toast组件(成功/错误/警告) + 自动消失(3s) + 可手动关闭 |
| 涉及文件 | apps/admin-panel/src/components/ui/toast.tsx(新) + layout.tsx |
| 工时预估 | 2h |
| 替换 | 所有alert() -> toast() |

### T19 Loading Skeleton
| 项目 | 内容 |
|------|------|
| 开发内容 | 所有页面增加骨架屏动画 |
| 涉及文件 | apps/admin-panel/src/app/*/page.tsx |
| 工时预估 | 3h |
| 验收标准 | 每个数据加载区有骨架屏 |

## 工时汇总

| 阶段 | 任务数 | 工时 |
|------|--------|------|
| 第一阶段: 选品闭环 | 6 | 15h |
| 第二阶段: 内容闭环 | 5 | 10h |
| 第三阶段: 复盘闭环 | 6 | 17h |
| 第四阶段: 基础建设 | 2 | 5h |
| 合计 | 19 | 47h |

## 优先级建议

本周(P0): T1 T4 T7 T10 T18 T19 (13h)
下周(P1): T2 T3 T5 T6 T8 T9 T11 (17h)
下下周(P2): T12 T13 T14 T15 T16 T17 (17h)
