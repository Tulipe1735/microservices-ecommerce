import { Hono } from "hono";
import { prisma } from "@repo/payment-db";
import { shouldBeUser } from "../middleware/authMiddleware.js";
import {
  buildCart,
  checkoutParameters,
  checkoutSchema,
} from "../utils/checkout.js";
import { CheckoutError, getStripe } from "../utils/stripe.js";

const sessionRoute = new Hono<{ Variables: { userId: string } }>();
sessionRoute.post("/create-checkout-session", shouldBeUser, async (c) => {
  let checkoutId: string | undefined;
  try {
    const parsed = checkoutSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success)
      return c.json(
        { message: "Please provide a valid cart and shipping address." },
        400,
      );
    const userId = c.get("userId");
    const stripe = getStripe();
    const { cart, amount } = await buildCart(parsed.data.cart);
    const checkout = await prisma.stripeCheckout.create({
      data: {
        userId,
        cart,
        amount,
        currency: "usd",
        shippingAddress: parsed.data.shippingForm,
      },
    });
    checkoutId = checkout.id;
    const session = await stripe.checkout.sessions.create(
      checkoutParameters(checkout.id, userId, cart),
      { idempotencyKey: checkout.id },
    );
    if (!session.url || !session.payment_method_types.includes("alipay")) {
      await stripe.checkout.sessions.expire(session.id);
      throw new CheckoutError(
        "Alipay is unavailable. Enable Alipay in your Stripe payment settings.",
        503,
      );
    }
    await prisma.stripeCheckout.update({
      where: { id: checkout.id },
      data: { sessionId: session.id },
    });
    return c.json({
      paymentUrl: session.url,
      sessionId: session.id,
      orderId: checkout.id,
    });
  } catch (error) {
    if (checkoutId)
      await prisma.stripeCheckout
        .updateMany({
          where: { id: checkoutId, sessionId: null, status: "pending" },
          data: { status: "failed" },
        })
        .catch(() => undefined);
    if (error instanceof CheckoutError)
      return c.json({ message: error.message }, error.status);
    console.error(
      "Checkout creation failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return c.json(
      { message: "Unable to start Alipay checkout. Please try again." },
      500,
    );
  }
});

sessionRoute.get("/:session_id", shouldBeUser, async (c) => {
  try {
    const checkout = await prisma.stripeCheckout.findFirst({
      where: {
        sessionId: c.req.param("session_id"),
        userId: c.get("userId"),
      },
    });
    if (!checkout)
      return c.json({ message: "Payment session not found." }, 404);
    const session = await getStripe().checkout.sessions.retrieve(
      c.req.param("session_id"),
    );
    const status =
      checkout.status === "success"
        ? "success"
        : session.status === "expired"
          ? "cancelled"
          : session.payment_status === "paid"
            ? "processing"
            : checkout.status;
    return c.json({
      orderId: checkout.id,
      status,
      paymentStatus: session.payment_status,
      cart: checkout.status === "success" ? checkout.cart : [],
    });
  } catch (error) {
    console.error(
      "Payment status lookup failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return c.json(
      { message: "Unable to check payment status. Please try again." },
      500,
    );
  }
});
export default sessionRoute;
