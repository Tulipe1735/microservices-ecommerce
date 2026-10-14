# Stripe 支付宝支付服务

Pulse 已把 Payme 替换为 Stripe Hosted Checkout，结账只接受支付宝。商品库和前端仍以 **美元**计价：商品价格 25 表示 25 USD，发送给 Stripe 的单价是 2500 美分。支付宝展示买家的实际付款金额；切换为人民币需要先统一修改商品价格与展示币种，不能直接把 USD 改为 CNY。

## 配置和启动

运行环境建议 Node.js 22，沿用仓库的 pnpm 9。从仓库根目录执行：

```bash
pnpm install --frozen-lockfile
cp apps/payment-service/.env.example apps/payment-service/.env
```

填写 payment-service 的 `.env`。`DATABASE_URL` 指向现有商品库，`PAYMENT_DATABASE_URL` 指向支付库，`REDIS_URL` 与 order-service 一致。Clerk 的服务端密钥和公钥来自现有认证配置。前端保持 `NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:8002`。

`STRIPE_API_KEY` 优先使用具有 Checkout Sessions 所需读写权限的 restricted API key。服务端密钥和 webhook 签名密钥只保存到本地忽略的 `.env` 或部署平台的秘密配置中。

### 支付数据库

将 `PAYMENT_DATABASE_URL` 同时配置到 `packages/payment-db/.env`，将 `DATABASE_URL` 配置到 `packages/product-db/.env`，便于 Prisma CLI 读取。首次安装生成客户端：

```bash
pnpm --filter @repo/product-db exec prisma generate
pnpm --filter @repo/payment-db exec prisma generate
```

对于已有 Payme 支付库，新增表的脚本在 `packages/payment-db/prisma/stripe-checkout.sql`，只新增 StripeCheckout 表和索引。通过数据库管理工具对支付库执行一次该脚本；原 PaymeTransaction 表保留历史数据。如果是空的开发数据库，也可以运行 `pnpm --filter @repo/payment-db exec prisma db push` 创建当前 schema。不要对支付库应用商品库的 schema。

订单库新增稀疏的唯一 `paymentId` 索引。order-service 启动时等待 `Order.init()`，确保默认自动索引配置下索引已准备好再消费消息。如果生产关闭了 Mongoose 自动索引，请预先创建索引：

```javascript
db.orders.createIndex({ paymentId: 1 }, { unique: true, sparse: true });
```

### Stripe 和支付宝

在所用 Stripe 测试环境的支付方式设置中启用支付宝；上线时对正式环境单独配置。可选 `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID` 指向包含支付宝的配置。代码使用 `allowed_payment_method_types: ['alipay']` 过滤动态支付方式，不接受信用卡代替支付宝。当前使用 Stripe Node SDK 23，默认 API 版本为 2026-09-30.endive。

支付宝商户地区和可用币种受 Stripe 账户限制。中国大陆消费者可以付款，但中国大陆不在 Stripe 支付宝商户地区列表中；正式收款需要符合地区和业务条件的 Stripe 商户账户。美元是否可用也取决于商户地区和账户配置。

本地 webhook 使用 Stripe CLI：

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to http://localhost:8002/webhooks
```

将 CLI 输出的签名密钥写入 payment-service `.env` 的 `STRIPE_WEBHOOK_SECRET`，然后启动或重启服务。正式部署在 Stripe Workbench 创建指向 `https://你的支付服务/webhooks` 的 endpoint，并订阅上面四种事件；使用该 endpoint 的签名密钥。

```bash
pnpm --filter order-service dev
pnpm --filter payment-service dev
pnpm --filter client dev
```

完整操作顺序：购物车 → 收货信息 → 支付宝支付 → Stripe 沙箱授权页 → 返回 Pulse → 查看订单。取消或失败时保留购物车。返回页面轮询两分钟，超时后可手动重新查询。订单由异步消费者生成，因此返回页面付款确认后可能需要短暂等待。

## 支付链路

- `POST /sessions/create-checkout-session`：需要 Clerk 认证。请求只包含商品 ID、数量、尺码、颜色和收货信息。服务端从商品库读取价格并校验规格，保存不可变的购物车/收货快照，再创建 Stripe 会话。
- `GET /sessions/:session_id`：需要 Clerk 认证，只能查询自己的会话。返回 Stripe 付款状态和本地处理状态。查询页面不会创建订单。
- `POST /webhooks`：使用原始请求体验证 `Stripe-Signature`，不依赖 Clerk 登录。只有已付款的 completed / async_payment_succeeded 事件触发订单；未付款、失败和过期事件不会生成订单。
- 回调验证会话、用户、金额和币种与快照一致。数据库行锁串行处理同一付款的重复/并发事件；发送订单消息后记录 publishedAt。
- `payment.successful` 改用 Redis Stream (`stream:payment.successful`) 持久化投递。订单服务使用 consumer group，成功后 ACK，失败或重启后的 pending 消息会在约一分钟后重试。Redis 不可用时 webhook 返回错误，Stripe 自动重试。Redis 本身也需按部署环境配置持久化和备份。
- MongoDB 按 Stripe session ID 作为 paymentId 去重。数据库事务提交前如果消息已经进入 Redis，重试也不会重复创建订单。
- 旧的 `/payme/callback` 接口停止使用。新版本 payment-service 与 order-service 需配套部署；旧版订单服务只消费 Pub/Sub，无法接收新的持久化支付事件。

## 验证

```bash
pnpm --filter payment-service check-types
pnpm --filter order-service check-types
pnpm --filter client check-types
pnpm --filter @repo/redis check-types
pnpm --filter payment-service test
pnpm --filter order-service test
```

自动测试覆盖服务端定价、无效规格/数量、访问控制、原始签名、未付款/异步失败、金额币种不一致、重复回调、Redis 失败重试和订单去重。测试使用模拟的外部服务，不需要真实密钥。

官方文档：[支付宝](https://docs.stripe.com/payments/alipay)、[Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create)、[支付回调和履约](https://docs.stripe.com/checkout/fulfillment)、[支付方式配置](https://docs.stripe.com/payments/payment-method-configurations)。
