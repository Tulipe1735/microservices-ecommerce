# Pulse E-commerce

基于 Turborepo 的事件驱动微服务电商平台。两个 Next.js 前端（顾客商城 `client`、管理后台 `admin`）配合多个 Node.js 后端服务，通过 Redis Streams 异步通信，使用 Clerk 认证、Stripe 支付，并以 PostgreSQL / MongoDB 持久化数据。

## 在线预览

| 应用 | 网址 |
| --- | --- |
| 商城（client） | https://pulse-client-tulipe1735s-projects.vercel.app/ |
| 管理后台（admin） | https://pulse-admin-rust.vercel.app/ |

## 架构

| 应用 | 技术 | 端口 | 职责 |
| --- | --- | --- | --- |
| `apps/client` | Next.js | 3002 | 顾客商城、购物车与结账 |
| `apps/admin` | Next.js | 3003 | 管理后台（商品、分类、订单、用户） |
| `apps/product-service` | Express | 8000 | 商品与分类 |
| `apps/order-service` | Fastify | 8001 | 订单流程 |
| `apps/payment-service` | Hono | 8002 | Stripe 结账会话与 Webhook |
| `apps/auth-service` | Express | 8003 | 基于 Clerk 的用户管理 |
| `apps/email-service` | Redis 消费者 | — | 欢迎邮件与订单通知 |

各服务通过 Redis Streams 异步通信（如 `user.created`、`order.created`），邮件服务消费这些事件发送通知。

### 共享包

- `@repo/redis` – Redis Streams 生产者与消费者封装
- `@repo/product-db` / `@repo/payment-db` – PostgreSQL 数据库客户端（Prisma）
- `@repo/order-db` – MongoDB 数据库客户端
- `@repo/types` – 共享 TypeScript 类型
- `@repo/eslint-config` / `@repo/typescript-config` – 共享配置

## 技术栈

Turborepo · pnpm · TypeScript · Next.js · React · Express · Fastify · Hono · Redis Streams · PostgreSQL · MongoDB · Clerk · Stripe · Prisma · Tailwind CSS

## 本地开发

```sh
# 安装依赖
pnpm install

# 启动全部应用与服务
pnpm dev

# 类型检查
pnpm check-types

# 构建
pnpm build
```

按过滤器运行单个工作区：

```sh
pnpm dev --filter=client
pnpm dev --filter=admin
```

## 部署

- 后端 Docker 与 Vercel 配置见 [部署说明](deploy/README.md)。
- 支付已改为 Stripe 支付宝；配置、数据变更与测试说明见 [支付服务文档](apps/payment-service/README.md)。
