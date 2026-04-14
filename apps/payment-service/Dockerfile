# ---------- 1. 基础镜像 ----------
FROM node:20-alpine

# ---------- 2. 工作目录 ----------
WORKDIR /app

# ---------- 3. 安装 pnpm ----------
RUN npm install -g pnpm

# ---------- 4. 复制整个 monorepo ----------
# ⚠️ 必须复制 root（因为你用了 workspace:*）
COPY . .

# ---------- 5. 安装依赖 ----------
RUN pnpm install --frozen-lockfile

# ---------- 6. 构建 payment-service ----------
RUN pnpm --filter payment-service build

# ---------- 7. 切换到 service 目录 ----------
WORKDIR /app/apps/payment-service

# ---------- 8. 暴露端口 ----------
EXPOSE 3000

# ---------- 9. 启动 ----------
CMD ["pnpm", "start"]