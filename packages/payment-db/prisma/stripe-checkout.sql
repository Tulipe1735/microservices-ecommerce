-- CreateTable
CREATE TABLE IF NOT EXISTS "StripeCheckout" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "cart" JSONB NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentIntentId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StripeCheckout_sessionId_key" ON "StripeCheckout"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StripeCheckout_userId_createdAt_idx" ON "StripeCheckout"("userId", "createdAt");
