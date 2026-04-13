import { Hono } from "hono";
import { shouldBeUser } from "../middleware/authMiddleware.js";
import { CartItemsType } from "@repo/types";
import { createPaymeUrl } from "../utils/payme.js";

const sessionRoute = new Hono();

// 创建支付 URL（替代原来的 Stripe checkout session）
sessionRoute.post("/create-checkout-session", shouldBeUser, async (c) => {
  const { cart }: { cart: CartItemsType } = await c.req.json();
  const userId = c.get("userId");

  try {
    // 计算总金额（单位：UZS）
    // 注意：你的 cart item price 如果是 USD，需要先换算成 UZS
    const totalUZS = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    const orderId = `order_${userId}_${Date.now()}`;

    const paymentUrl = createPaymeUrl(orderId, totalUZS);

    return c.json({ paymentUrl, orderId });
  } catch (error) {
    console.log(error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session.";

    return c.json({ message }, 500);
  }
});

// 根据 orderId 查询支付状态（从数据库查，不再依赖 Stripe）
sessionRoute.get("/:order_id", async (c) => {
  const { order_id } = c.req.param();

  // TODO: 从你的数据库查询该订单的支付状态
  // 例如：const order = await db.order.findUnique({ where: { id: order_id } });
  // Payme 回调成功后会把状态写入数据库（在 webhooks.route.ts 里处理）

  return c.json({
    orderId: order_id,
    status: "pending", // 从 db 查：'pending' | 'paid' | 'cancelled'
  });
});

export default sessionRoute;
