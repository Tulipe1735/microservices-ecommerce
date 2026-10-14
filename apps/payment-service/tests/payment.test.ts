import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  checkout: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  products: vi.fn(),
  publish: vi.fn(),
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
  expireSession: vi.fn(),
}));
vi.mock("@repo/payment-db", () => ({
  prisma: {
    stripeCheckout: mocks.checkout,
    $transaction: mocks.transaction,
    $queryRaw: mocks.queryRaw,
  },
}));
vi.mock("@repo/product-db", () => ({
  prisma: { product: { findMany: mocks.products } },
}));
vi.mock("../src/utils/redis.js", () => ({
  producer: { sendDurable: mocks.publish },
}));
vi.mock("@hono/clerk-auth", () => ({
  getAuth: (c: { req: { header: (name: string) => string | undefined } }) => {
    const token = c.req.header("authorization");
    return token
      ? { userId: token === "Bearer other" ? "other" : "user_1" }
      : { userId: null };
  },
}));
vi.mock("../src/utils/stripe.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../src/utils/stripe.js")>();
  const { default: StripeClient } = await import("stripe");
  const client = new StripeClient("local-test-only");
  vi.spyOn(client.checkout.sessions, "create").mockImplementation(
    mocks.createSession,
  );
  vi.spyOn(client.checkout.sessions, "retrieve").mockImplementation(
    mocks.retrieveSession,
  );
  vi.spyOn(client.checkout.sessions, "expire").mockImplementation(
    mocks.expireSession,
  );
  return { ...original, getStripe: () => client };
});

import sessionRoute from "../src/routes/session.route.js";
import webhookRoute from "../src/routes/webhooks.route.js";
import { prisma } from "@repo/payment-db";

const app = new Hono()
  .route("/sessions", sessionRoute)
  .route("/webhooks", webhookRoute);
const ship = {
  name: "Test Buyer",
  phone: "123456789",
  address: "1 Test Road",
  city: "Shanghai",
};
const item = { id: 1, quantity: 2, selectedSize: "M", selectedColor: "blue" };
const snapshot = () => ({
  id: "checkout_1",
  sessionId: "cs_test_1",
  userId: "user_1",
  amount: 5000,
  currency: "usd",
  cart: [{ ...item, name: "Shirt", price: 25 }],
  shippingAddress: ship,
  status: "pending",
  publishedAt: null as Date | null,
  paymentIntentId: null as string | null,
});
let saved = snapshot();
const session = (overrides = {}) => ({
  id: "cs_test_1",
  mode: "payment",
  client_reference_id: "checkout_1",
  metadata: {
    integration: "pulse",
    checkoutId: "checkout_1",
    userId: "user_1",
  },
  amount_total: 5000,
  currency: "usd",
  payment_status: "paid",
  status: "complete",
  payment_intent: "pi_test_1",
  customer_details: { email: "buyer@example.com" },
  ...overrides,
});
const webhook = async (
  type = "checkout.session.completed",
  overrides = {},
  signature?: string,
) => {
  const body = JSON.stringify({
    id: "evt_test_1",
    object: "event",
    type,
    data: { object: session(overrides) },
  });
  const signed =
    signature ??
    new Stripe("local-test-only").webhooks.generateTestHeaderString({
      payload: body,
      secret: "local-signing-secret",
    });
  return app.request("/webhooks", {
    method: "POST",
    body,
    headers: { "stripe-signature": signed },
  });
};
const checkout = (
  cart: unknown = [{ ...item, name: "Fake name", price: 0.01 }],
  auth = "Bearer owner",
) =>
  app.request("/sessions/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify({ cart, shippingForm: ship }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "local-signing-secret");
  vi.stubEnv("CLIENT_URL", "http://localhost:3002");
  saved = snapshot();
  mocks.products.mockResolvedValue([
    { id: 1, name: "Shirt", price: 25, sizes: ["M"], colors: ["blue"] },
  ]);
  mocks.checkout.create.mockImplementation(async ({ data }) => {
    saved = { ...saved, ...data };
    return saved;
  });
  mocks.checkout.findUnique.mockImplementation(async () => saved);
  mocks.checkout.findFirst.mockImplementation(async ({ where }) =>
    where.userId === saved.userId && where.sessionId === saved.sessionId
      ? saved
      : null,
  );
  mocks.checkout.update.mockImplementation(async ({ data }) => {
    saved = { ...saved, ...data };
    return saved;
  });
  mocks.checkout.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<void>) => {
      const before = structuredClone(saved);
      try {
        return await fn(prisma);
      } catch (error) {
        saved = before;
        throw error;
      }
    },
  );
  mocks.publish.mockResolvedValue(undefined);
  mocks.createSession.mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/test",
    payment_method_types: ["alipay"],
  });
  mocks.retrieveSession.mockResolvedValue(session());
  mocks.expireSession.mockResolvedValue({});
});

describe("Alipay checkout API", () => {
  it("requires authentication before creating a checkout", async () => {
    expect((await checkout([item], "")).status).toBe(401);
    expect(mocks.checkout.create).not.toHaveBeenCalled();
  });
  it("uses catalog USD prices and saves shipping, ignoring client prices", async () => {
    expect((await checkout()).status).toBe(200);
    expect(saved.amount).toBe(5000);
    expect(saved.shippingAddress).toEqual(ship);
    expect(saved.cart[0]?.price).toBe(25);
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        allowed_payment_method_types: ["alipay"],
        success_url:
          "http://localhost:3002/return?session_id={CHECKOUT_SESSION_ID}",
        line_items: [
          expect.objectContaining({
            quantity: 2,
            price_data: expect.objectContaining({
              unit_amount: 2500,
              currency: "usd",
            }),
          }),
        ],
      }),
      { idempotencyKey: "checkout_1" },
    );
  });
  it.each([
    { cart: [] },
    { cart: [{ ...item, quantity: -1 }] },
    { cart: [{ ...item, quantity: 1.5 }] },
    { cart: [item, item] },
  ])("rejects invalid carts: $cart", async ({ cart }) => {
    expect((await checkout(cart)).status).toBe(400);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("rejects an unavailable product variant", async () => {
    expect((await checkout([{ ...item, selectedColor: "red" }])).status).toBe(
      400,
    );
  });
  it("expires a checkout that cannot offer Alipay", async () => {
    mocks.createSession.mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/test",
      payment_method_types: ["card"],
    });
    expect((await checkout()).status).toBe(503);
    expect(mocks.expireSession).toHaveBeenCalledWith("cs_test_1");
  });
  it("hides sessions belonging to another user", async () => {
    expect(
      (
        await app.request("/sessions/cs_test_1", {
          headers: { authorization: "Bearer other" },
        })
      ).status,
    ).toBe(404);
    expect(mocks.retrieveSession).not.toHaveBeenCalled();
  });
  it("shows processing until the signed webhook fulfills a paid session", async () => {
    const response = await app.request("/sessions/cs_test_1", {
      headers: { authorization: "Bearer owner" },
    });
    expect(await response.json()).toMatchObject({
      status: "processing",
      cart: [],
    });
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});

describe("signed Stripe webhooks", () => {
  it("rejects missing or forged signatures", async () => {
    expect(
      (await app.request("/webhooks", { method: "POST", body: "{}" })).status,
    ).toBe(400);
    expect(
      (await webhook("checkout.session.completed", {}, "forged")).status,
    ).toBe(400);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("publishes a complete, durable order once even on repeated events", async () => {
    expect((await webhook()).status).toBe(200);
    expect(
      (await webhook("checkout.session.async_payment_succeeded")).status,
    ).toBe(200);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.publish).toHaveBeenCalledWith("payment.successful", {
      value: {
        paymentId: "cs_test_1",
        userId: "user_1",
        username: ship.name,
        email: "buyer@example.com",
        amount: 50,
        currency: "usd",
        status: "success",
        shippingAddress: ship,
        products: [
          {
            productId: 1,
            name: "Shirt",
            price: 25,
            quantity: 2,
            selectedSize: "M",
            selectedColor: "blue",
          },
        ],
      },
    });
    expect(saved.status).toBe("success");
  });
  it("waits for async payment success before creating an order", async () => {
    expect(
      (
        await webhook("checkout.session.completed", {
          payment_status: "unpaid",
        })
      ).status,
    ).toBe(200);
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(saved.status).toBe("processing");
    expect(
      (await webhook("checkout.session.async_payment_succeeded")).status,
    ).toBe(200);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });
  it.each([
    { amount_total: 1 },
    { currency: "cny" },
    { client_reference_id: "another_checkout" },
  ])("rejects mismatched payment details: %j", async (overrides) => {
    expect(
      (await webhook("checkout.session.completed", overrides)).status,
    ).toBe(500);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it.each([
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ])("does not create orders for %s", async (type) => {
    expect((await webhook(type, { payment_status: "unpaid" })).status).toBe(
      200,
    );
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(saved.status).toBe(
      type.endsWith("expired") ? "cancelled" : "failed",
    );
  });
  it("does not overwrite a paid checkout with a late failure", async () => {
    await webhook();
    await webhook("checkout.session.async_payment_failed");
    expect(saved.status).toBe("success");
  });
  it("returns an error on Redis failure so Stripe can safely retry", async () => {
    mocks.publish.mockRejectedValueOnce(new Error("Redis offline"));
    expect((await webhook()).status).toBe(500);
    expect(saved.publishedAt).toBeNull();
    expect((await webhook()).status).toBe(200);
    expect(saved.status).toBe("success");
  });
  it("ignores sessions from other integrations", async () => {
    expect(
      (
        await webhook("checkout.session.completed", {
          metadata: { integration: "other" },
        })
      ).status,
    ).toBe(200);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
