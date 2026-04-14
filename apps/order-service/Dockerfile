FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制整个 monorepo
COPY . .

# 安装依赖
RUN pnpm install --frozen-lockfile

# 构建当前服务
RUN pnpm --filter order-service build

# 进入服务目录
WORKDIR /app/apps/order-service

EXPOSE 3000

CMD ["pnpm", "start"]