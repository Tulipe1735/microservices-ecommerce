FROM node:22-alpine

RUN apk add --no-cache openssl \
    && npm install --global pnpm@9.0.0

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-service ./apps/auth-service
COPY apps/product-service ./apps/product-service
COPY apps/order-service ./apps/order-service
COPY apps/payment-service ./apps/payment-service
COPY packages/redis ./packages/redis
COPY packages/product-db ./packages/product-db
COPY packages/order-db ./packages/order-db
COPY packages/payment-db ./packages/payment-db
COPY packages/types ./packages/types
COPY packages/typescript-config ./packages/typescript-config

# One image shared by the four services; frontends build independently on Vercel.
RUN pnpm install --frozen-lockfile \
      --filter auth-service... --filter product-service... \
      --filter order-service... --filter payment-service... \
    && pnpm --filter @repo/product-db exec prisma generate \
    && pnpm --filter @repo/payment-db exec prisma generate \
    && pnpm --filter auth-service --filter product-service \
      --filter order-service --filter payment-service check-types

ENV NODE_ENV=production
USER node
WORKDIR /app/apps/payment-service
CMD ["node", "--import", "tsx", "src/index.ts"]
