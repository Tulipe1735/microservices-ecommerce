import { Hono } from "hono";
import { shouldBeUser } from "../middleware/authMiddleware.js";
import { CartItemsType } from "@repo/types";
import { createPaymeUrl } from "../utils/payme.js";
import { prisma } from "@repo/payment-db";

const sessionRoute = new Hono();

sessionRoute.post("/create-checkout-session", shouldBeUser, async (c) => {
  const { cart }: { cart: CartItemsType } = await c.req.json();
  const userId = c.get("userId");

  try {
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

// Payme transaction state 映射
const stateToStatus = (state: number) => {
  switch (state) {
    case 2:
      return "success";
    case -1:
      return "cancelled";
    case 1:
      return "processing";
    default:
      return "pending";
  }
};

sessionRoute.get("/:order_id", async (c) => {
  const { order_id } = c.req.param();

  try {
    const transaction = await prisma.paymeTransaction.findFirst({
      where: { orderId: order_id },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      orderId: order_id,
      status: transaction ? stateToStatus(transaction.state) : "pending",
    });
  } catch (error) {
    console.log(error);
    return c.json({ message: "Failed to get payment status." }, 500);
  }
});

export default sessionRoute;
