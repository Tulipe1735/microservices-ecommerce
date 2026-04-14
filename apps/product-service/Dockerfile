# ---------- 1️⃣ 基础 ----------
FROM node:20-alpine

WORKDIR /app

# ---------- 2️⃣ pnpm ----------
RUN npm install -g pnpm

# ---------- 3️⃣ 复制整个 monorepo ----------
COPY . .

# ---------- 4️⃣ 安装依赖 ----------
RUN pnpm install --frozen-lockfile

# ---------- 5️⃣ Prisma generate（关键！！！） ----------
RUN pnpm --filter product-service exec prisma generate

# ---------- 6️⃣ 构建 ----------
RUN pnpm --filter product-service build

# ---------- 7️⃣ 进入 service ----------
WORKDIR /app/apps/product-service

# ---------- 8️⃣ 暴露端口 ----------
EXPOSE 3000

# ---------- 9️⃣ 启动 ----------
CMD ["pnpm", "start"]