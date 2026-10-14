import { Hono } from "hono";
import { prisma } from "@repo/payment-db";
import { shippingFormSchema } from "@repo/types";
import Stripe from "stripe";
import { z } from "zod";
import { producer } from "../utils/redis.js";
import { savedCartSchema } from "../utils/checkout.js";
import { getStripe } from "../utils/stripe.js";

type CheckoutEvent =
  | "checkout.session.completed"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  | "checkout.session.expired";

const handleSession = async (
  type: CheckoutEvent,
  session: Stripe.Checkout.Session,
) => {
  if (session.mode !== "payment" || session.metadata?.integration !== "pulse")
    return;
  const checkoutId = session.metadata.checkoutId;
  if (!checkoutId) throw new Error("Missing checkout reference.");
  await prisma.$transaction(
    async (tx) => {
      // Serialize concurrent events for this checkout, including different event IDs.
      await tx.$queryRaw`SELECT "id" FROM "StripeCheckout" WHERE "id" = ${checkoutId} FOR UPDATE`;
      const checkout = await tx.stripeCheckout.findUnique({
        where: { id: checkoutId },
      });
      if (!checkout) throw new Error("Checkout not found.");
      if (
        checkout.userId !== session.metadata?.userId ||
        session.client_reference_id !== checkout.id ||
        (checkout.sessionId && checkout.sessionId !== session.id) ||
        checkout.amount !== session.amount_total ||
        checkout.currency !== session.currency
      ) {
        throw new Error("Payment does not match the saved checkout.");
      }
      if (checkout.publishedAt) return;
      if (
        type === "checkout.session.async_payment_failed" ||
        type === "checkout.session.expired"
      ) {
        await tx.stripeCheckout.update({
          where: { id: checkout.id },
          data: {
            sessionId: session.id,
            status:
              type === "checkout.session.expired" ? "cancelled" : "failed",
          },
        });
        return;
      }
      if (session.payment_status !== "paid") {
        await tx.stripeCheckout.update({
          where: { id: checkout.id },
          data: { sessionId: session.id, status: "processing" },
        });
        return;
      }
      const cart = savedCartSchema.parse(checkout.cart);
      const shippingAddress = shippingFormSchema.parse(
        checkout.shippingAddress,
      );
      const email = z.email().parse(session.customer_details?.email);
      await producer.sendDurable("payment.successful", {
        value: {
          paymentId: session.id,
          userId: checkout.userId,
          username: shippingAddress.name,
          email,
          amount: checkout.amount / 100,
          currency: checkout.currency,
          status: "success",
          shippingAddress,
          products: cart.map(({ id, ...item }) => ({ productId: id, ...item })),
        },
      });
      // Stripe retries Redis/commit failures; order-service deduplicates paymentId.
      await tx.stripeCheckout.update({
        where: { id: checkout.id },
        data: {
          sessionId: session.id,
          status: "success",
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
          publishedAt: new Date(),
        },
      });
    },
    { timeout: 15_000 },
  );
};

const webhookRoute = new Hono();
webhookRoute.post("/", async (c) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return c.json({ message: "Stripe webhook is not configured." }, 503);
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.json({ message: "Missing Stripe signature." }, 400);
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await c.req.text(),
      signature,
      secret,
    );
  } catch {
    return c.json({ message: "Invalid Stripe signature." }, 400);
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await handleSession(event.type, event.data.object);
    }
    return c.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return c.json(
      { message: "Unable to process payment. Stripe can retry this event." },
      500,
    );
  }
});
export default webhookRoute;
