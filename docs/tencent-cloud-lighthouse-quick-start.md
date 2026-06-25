# 腾讯云轻量应用服务器快速部署

目标：先用一台轻量应用服务器跑完整闭环测试。App、PostgreSQL、nginx 都放在同一台服务器上。

## 服务器要求

- 系统：Ubuntu 20.04 / 22.04 / 24.04
- 内存：至少 2GB，推荐 4GB
- 防火墙：开放 80 端口

## 目录

建议把项目放到：

```bash
/opt/ecommerce-ai
```

## 一键部署

进入服务器后执行：

```bash
cd /opt/ecommerce-ai
sudo bash scripts/tencent-cloud-quick-deploy-ubuntu.sh
```

脚本会自动：

- 安装 Node.js 20
- 安装 PostgreSQL
- 创建数据库 `ecommerce_ai`
- 执行 `scripts/tencent-cloud-postgres-schema.sql`
- 写入 `apps/admin-panel/.env.local`
- 构建 Next.js App
- 用 pm2 后台运行 App
- 用 nginx 把 80 端口转发到 App

完成后访问：

```text
http://服务器公网IP
```

## 指定数据库密码

如果想自己指定数据库密码：

```bash
cd /opt/ecommerce-ai
sudo DB_PASSWORD='换成你的强密码' bash scripts/tencent-cloud-quick-deploy-ubuntu.sh
```

## 查看数据库连接串

部署完成后在服务器查看：

```bash
sudo cat /opt/ecommerce-ai/tencent-cloud-deploy-info.txt
```

里面会有：

```text
Database URL: postgresql://ecommerce_ai:密码@127.0.0.1:5432/ecommerce_ai
```

这个连接串已经写入 `.env.local`，一般不需要再到页面手动填写。

## 常用命令

查看 App 状态：

```bash
pm2 status
```

查看 App 日志：

```bash
pm2 logs ecommerce-ai-admin
```

重启 App：

```bash
pm2 restart ecommerce-ai-admin
```

查看 nginx：

```bash
systemctl status nginx
```

查看 PostgreSQL：

```bash
systemctl status postgresql
```

## 闭环测试顺序

1. 打开 `http://服务器公网IP/settings`
2. 填 DeepSeek API Key
3. 添加真实 1688 商品链接
4. 保存到产品池
5. 加入测试池
6. 生成小红书/闲鱼内容草稿
7. 审核通过
8. 手动发布到平台
9. 回填发布链接
10. 记录每日数据
11. 查看 7 天复盘
