import { Hono } from "hono";
import { producer } from "../utils/redis.js";
import { verifyPaymeCallback } from "../utils/payme.js";
import { prisma } from "@repo/payment-db";

const webhookRoute = new Hono();

webhookRoute.get("/", (c) => {
  return c.json({
    status: "ok webhook",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

webhookRoute.post("/callback", async (c) => {
  const auth = c.req.header("authorization") ?? "";
  const base64 = auth.replace("Basic ", "");
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [login, password] = decoded.split(":");

  if (!verifyPaymeCallback(login, password)) {
    return c.json({
      error: {
        code: -32504,
        message: { ru: "Запрещено", en: "Forbidden", uz: "Taqiqlangan" },
      },
    });
  }

  const { id, method, params } = await c.req.json();

  switch (method) {
    case "CheckPerformTransaction": {
      // 检查订单是否存在（orderId 格式：order_userId_timestamp）
      const orderExists = params.account.order_id?.startsWith("order_");
      if (!orderExists) {
        return c.json({
          id,
          error: { code: -31050, message: { en: "Order not found" } },
        });
      }
      return c.json({ id, result: { allow: true } });
    }

    case "CreateTransaction": {
      // 幂等：已存在则直接返回
      const existing = await prisma.paymeTransaction.findUnique({
        where: { id: params.id },
      });

      if (existing) {
        return c.json({
          id,
          result: {
            create_time: existing.createTime,
            transaction: existing.id,
            state: existing.state,
          },
        });
      }

      const tx = await prisma.paymeTransaction.create({
        data: {
          id: params.id,
          orderId: params.account.order_id,
          amount: params.amount,
          state: 1,
          createTime: BigInt(params.time),
        },
      });

      return c.json({
        id,
        result: {
          create_time: tx.createTime,
          transaction: tx.id,
          state: tx.state,
        },
      });
    }

    case "PerformTransaction": {
      const tx = await prisma.paymeTransaction.update({
        where: { id: params.id },
        data: {
          state: 2,
          performTime: BigInt(Date.now()),
        },
      });

      await producer.send("payment.successful", {
        value: {
          orderId: tx.orderId,
          paymeTransactionId: tx.id,
          amount: tx.amount,
          status: "success",
        },
      });

      return c.json({
        id,
        result: {
          perform_time: tx.performTime,
          transaction: tx.id,
          state: tx.state,
        },
      });
    }

    case "CancelTransaction": {
      const tx = await prisma.paymeTransaction.update({
        where: { id: params.id },
        data: {
          state: -1,
          reason: params.reason,
          cancelTime: BigInt(Date.now()),
        },
      });

      await producer.send("payment.successful", {
        value: {
          orderId: tx.orderId,
          paymeTransactionId: tx.id,
          status: "cancelled",
          reason: tx.reason,
        },
      });

      return c.json({
        id,
        result: {
          cancel_time: tx.cancelTime,
          transaction: tx.id,
          state: tx.state,
        },
      });
    }

    case "CheckTransaction": {
      const tx = await prisma.paymeTransaction.findUnique({
        where: { id: params.id },
      });

      if (!tx) {
        return c.json({
          id,
          error: { code: -31003, message: { en: "Transaction not found" } },
        });
      }

      return c.json({
        id,
        result: {
          create_time: tx.createTime,
          perform_time: tx.performTime ?? 0,
          cancel_time: tx.cancelTime ?? 0,
          transaction: tx.id,
          state: tx.state,
          reason: tx.reason ?? null,
        },
      });
    }

    default:
      return c.json({
        id,
        error: { code: -32601, message: { en: "Method not found" } },
      });
  }
});

export default webhookRoute;
