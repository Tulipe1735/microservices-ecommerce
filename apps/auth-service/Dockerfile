FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制整个 monorepo（关键！）
COPY . .

# 安装所有 workspace 依赖
RUN pnpm install --frozen-lockfile

# 构建
RUN pnpm build

# 进入当前 service
WORKDIR /app/apps/auth-service

# 暴露端口
EXPOSE 3000

# 启动
CMD ["pnpm", "start"]