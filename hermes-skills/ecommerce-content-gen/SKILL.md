---
name: ecommerce-content-gen
description: 为电商产品生成小红书/闲鱼营销文案和图片Prompt
category: ecommerce
tags: [ecommerce, content, copywriting, xiaohongshu, xianyu]
---

# 电商内容生成 Skill

## 适用场景
- 产品完成评分（overall≥6）后需要生成营销文案
- 需要为小红书准备种草内容
- 需要为闲鱼准备上架文案
- 需要生成产品拍摄 Prompt 给设计师/ComfyUI

## 前置条件
- AI 评分已完成
- 产品信息完整（名称、描述、价格、标签）
- 内容安全过滤器已启用

## 执行步骤

### 1. 小红书文案生成
通过 n8n 触发：
```bash
curl -X POST https://n8n.example.com/webhook/content-generation \
  -H "Content-Type: application/json" \
  -d '{"product_id": "<uuid>", "platform": "xiaohongshu"}'
```

### 2. 闲鱼文案生成
```bash
curl -X POST https://n8n.example.com/webhook/content-generation \
  -H "Content-Type: application/json" \
  -d '{"product_id": "<uuid>", "platform": "xianyu"}'
```

### 3. 在后台面板操作
1. 进入 "内容草稿" 页面
2. 点击 "生成内容"
3. 选择产品和平台
4. 生成的内容自动进入审核队列

## 内容规范

### 小红书风格
- 标题：15-30字，含数字/情绪词
- 正文：150-300字，分段+emoji
- 标签：3-6个相关话题
- 语气：真实分享，避免硬广

### 闲鱼风格
- 标题：10-20字，含核心关键词
- 正文：50-150字，简洁有力
- 突出：性价比、成色、卖点

## 安全过滤（自动执行）
生成后自动检查：
- 无仿牌/山寨相关词汇
- 无医疗/减肥/保健品功效描述
- 无虚假宣传用语

违规则自动拦截，标记为 `rejected`。

## 图片 Prompt 规范
- 输出中英双语
- 包含光线、构图、角度、背景
- 不含品牌logo描述
- 适合 Stable Diffusion / ComfyUI
