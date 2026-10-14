# Pulse 后端 Docker 部署

client 与 admin 在 Vercel 分别部署；Docker 运行商品、订单、支付和认证服务，以及 PostgreSQL、MongoDB、Redis 和 Caddy。建议至少 2 GiB 内存，4 GiB 更有余量。较小实例适合轻量测试，镜像在开发机或 CI 构建后上传。

## 配置

复制根目录 `.env.example` 为 `.env`，填写数据库随机密码、两个前端地址、现有 Clerk 密钥和 Stripe 测试密钥。`.env` 已被 Git 和 Docker 构建忽略，限制文件权限为 `600`。

`CLERK_*` 使用两个前端所属认证应用的有效密钥。管理员需 `metadata.role = admin` 的会话声明，普通用户不能管理商品、用户或全部订单。

`BACKEND_HOST` 可以是固定公网 IPv4 地址，也可以是指向服务器的域名。Caddy 显式使用 Let’s Encrypt 的 `shortlived` 证书并自动续期；IP 证书约六天有效，80 和 443 端口必须持续可达。证书和账户存放在持久卷中。中国内地服务器对外提供网站服务的备案要求，请按[阿里云使用须知](https://help.aliyun.com/zh/simple-application-server/product-overview/usage-notes)办理；HTTPS 证书不代替备案。

数据库端口没有发布到公网。Redis 使用持久卷、AOF 和每次写入同步，支付成功事件通过 Streams 交付；订单服务写入成功才确认消息，并按 Stripe 会话去重。

## 构建与启动

在仓库根目录构建后端镜像：

```sh
docker build -f deploy/backend.Dockerfile -t pulse-backend:local .
```

服务器上放置根目录 `compose.yaml`、私有 `.env`、`deploy/` 和支付增量 SQL 文件。若服务器无法下载 Docker Hub 镜像，在开发机获取并通过 SSH 上传：

```sh
docker pull postgres:16-alpine
docker pull mongo:7
docker pull redis:7-alpine
docker pull caddy:2-alpine
docker save pulse-backend:local postgres:16-alpine mongo:7 redis:7-alpine caddy:2-alpine | gzip | ssh YOUR_SERVER 'docker load'
```

镜像准备好后启动：

```sh
docker compose config --quiet
docker compose up -d --no-build
docker compose ps
```

初次启动会创建 `pulse_products` 和 `pulse_payments` 数据库。支付 SQL 可以重复执行，保留原有 Payme 表和数据。订单数据库为 MongoDB 的 `pulse_orders`。

## Stripe 与 Vercel

Stripe 使用测试账户。本部署的 Webhook 入口为 `https://CLIENT_HOST/api/stripe-webhook`，Vercel 原样转发请求正文和 Stripe 签名到 Docker 的 `/payments-api/webhooks/`，由支付服务验证签名并处理到账。客户端生产地址需允许 Stripe 公网访问；商城结账仍需要 Clerk 登录。也可在确认 Stripe 能直接访问服务器后使用 `https://BACKEND_HOST/payments-api/webhooks/`。

启用以下事件，并将签名密钥保存在后端 `.env` 的 `STRIPE_WEBHOOK_SECRET`：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

两个 Vercel 项目分别以 `apps/client`、`apps/admin` 为根目录，保留各自 Clerk 配置，并配置：

| Vercel 配置项                     | 值                                  |
| --------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_PRODUCT_SERVICE_URL` | `https://BACKEND_HOST/products-api` |
| `NEXT_PUBLIC_ORDER_SERVICE_URL`   | `https://BACKEND_HOST/orders-api`   |
| `NEXT_PUBLIC_PAYMENT_SERVICE_URL` | `https://BACKEND_HOST/payments-api` |
| `NEXT_PUBLIC_AUTH_SERVICE_URL`    | `https://BACKEND_HOST/auth-api`     |

修改这些地址后重新部署，因为浏览器使用的变量会写入前端构建。

商品价格沿用仓库的 USD 整数美元，支付服务从数据库读价并转换为美分；浏览器提交的价格不会用于扣款。支付回调确认到账后保存事件，订单服务随后创建订单。

## 更新与查看状态

导入新镜像后重新执行 `docker compose up -d --no-build`，数据库和证书卷会保留。使用 `docker compose logs --tail=100 SERVICE` 查看指定服务，使用 `docker stats --no-stream` 查看内存。

`docker compose down` 停止服务并保留数据；不要在更新时使用 `down -v`，它会删除数据库和证书卷。

邮件服务需要单独配置自己拥有的发件邮箱，并未包含在本部署中。当前流程使用 Stripe 测试模式；上线真实收款还需要合格的正式 Stripe 账户、正式密钥与对应的 Webhook。
