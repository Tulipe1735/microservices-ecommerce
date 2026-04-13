import { Hono } from "hono";
import { producer } from "../utils/redis.js";

import { CartItemsType } from "@repo/types";
import { verifyPaymeCallback } from "../utils/payme.js";

const webhookRoute = new Hono();

webhookRoute.get("/", (c) => {
  return c.json({
    status: "ok webhook",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// Payme JSON-RPC 回调入口
// 在 Payme 商户后台配置：POST https://你的域名/payme/callback
webhookRoute.post("/callback", async (c) => {
  // 1. 验证 Basic Auth（Payme 用 Basic Auth 鉴权）
  const auth = c.req.header("authorization") ?? "";
  const base64 = auth.replace("Basic ", "");
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [login, password] = decoded.split(":");

  if (!verifyPaymeCallback(login, password)) {
    // Payme 规定：鉴权失败返回 JSON-RPC error，code -32504
    return c.json({
      error: {
        code: -32504,
        message: { ru: "Запрещено", en: "Forbidden", uz: "Taqiqlangan" },
      },
    });
  }

  const { id, method, params } = await c.req.json();

  switch (method) {
    // Payme 支付前检查订单是否合法
    case "CheckPerformTransaction": {
      // TODO: 从数据库查 params.account.order_id 是否存在且未支付
      // const order = await db.order.findUnique({ where: { id: params.account.order_id } });
      // if (!order) return c.json({ id, error: { code: -31050, message: "Order not found" } });

      return c.json({ id, result: { allow: true } });
    }

    // Payme 锁定订单，创建交易记录
    case "CreateTransaction": {
      // TODO: 在数据库创建 payme transaction 记录
      // await db.paymeTransaction.create({
      //   data: { id: params.id, orderId: params.account.order_id, state: 1, createTime: params.time }
      // });

      return c.json({
        id,
        result: {
          create_time: params.time, // 使用 Payme 传来的时间
          transaction: params.id, // Payme 的交易 ID
          state: 1, // 1 = 创建中
        },
      });
    }

    // 支付成功，发 Redis 消息通知其他服务
    case "PerformTransaction": {
      // TODO: 更新数据库订单状态为 paid
      // await db.order.update({ where: { id: params.account.order_id }, data: { status: "paid" } });

      // 发送支付成功消息（与原 Stripe 逻辑保持一致）
      await producer.send("payment.successful", {
        value: {
          orderId: params.account.order_id,
          paymeTransactionId: params.id,
          amount: params.amount, // 单位：tiyin
          status: "success",
        },
      });

      return c.json({
        id,
        result: {
          perform_time: Date.now(),
          transaction: params.id,
          state: 2, // 2 = 支付完成
        },
      });
    }

    // 退款/取消
    case "CancelTransaction": {
      // reason 说明取消原因：https://developer.payme.uz/documentation
      // TODO: 更新数据库订单状态为 cancelled
      // await db.order.update({ where: { id: params.account.order_id }, data: { status: "cancelled" } });

      await producer.send("payment.successful", {
        value: {
          orderId: params.account.order_id,
          paymeTransactionId: params.id,
          status: "cancelled",
          reason: params.reason,
        },
      });

      return c.json({
        id,
        result: {
          cancel_time: Date.now(),
          transaction: params.id,
          state: -1, // -1 = 已取消
        },
      });
    }

    // Payme 查询交易状态
    case "CheckTransaction": {
      // TODO: 从数据库查 params.id 对应的交易记录
      // const tx = await db.paymeTransaction.findUnique({ where: { id: params.id } });

      return c.json({
        id,
        result: {
          create_time: Date.now(), // 从 db 取
          perform_time: 0, // 从 db 取，未完成则为 0
          cancel_time: 0, // 从 db 取，未取消则为 0
          transaction: params.id,
          state: 1, // 从 db 取实际状态
          reason: null,
        },
      });
    }

    default:
      return c.json({
        id,
        error: {
          code: -32601,
          message: { ru: "Метод не найден", en: "Method not found" },
        },
      });
  }
});

export default webhookRoute;
