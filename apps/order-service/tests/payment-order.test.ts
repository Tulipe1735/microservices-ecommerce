import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), publish: vi.fn() }));
vi.mock("@repo/order-db", () => ({ Order: { updateOne: mocks.update } }));
vi.mock("../src/utils/redis", () => ({ producer: { send: mocks.publish } }));
import { createOrder, paidOrderSchema } from "../src/utils/order";

const value = {
  paymentId: "cs_test_order",
  userId: "user_test",
  username: "Buyer",
  email: "buyer@example.com",
  amount: 50,
  currency: "usd",
  status: "success" as const,
  shippingAddress: {
    name: "Buyer",
    phone: "123456789",
    address: "Test Road",
    city: "Shanghai",
  },
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
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.publish.mockResolvedValue(undefined);
});

it("stores paid orders once on stream redelivery", async () => {
  mocks.update
    .mockResolvedValueOnce({ upsertedCount: 1 })
    .mockResolvedValueOnce({ upsertedCount: 0 });
  const order = paidOrderSchema.parse({ value }).value;
  await createOrder(order);
  await createOrder(order);
  expect(mocks.update).toHaveBeenCalledWith(
    { paymentId: value.paymentId },
    { $setOnInsert: order },
    { upsert: true, runValidators: true },
  );
  expect(mocks.publish).toHaveBeenCalledTimes(1);
});
it("acknowledges a concurrent duplicate without creating another order", async () => {
  mocks.update.mockRejectedValueOnce(
    Object.assign(new Error("Duplicate payment"), { code: 11000 }),
  );
  await expect(createOrder(value)).resolves.toBeUndefined();
  expect(mocks.publish).not.toHaveBeenCalled();
});
it("lets database failures propagate so stream delivery retries", async () => {
  mocks.update.mockRejectedValueOnce(new Error("Database offline"));
  await expect(createOrder(value)).rejects.toThrow("Database offline");
});
it("rejects incomplete or failed payment payloads", () => {
  expect(
    paidOrderSchema.safeParse({
      value: { paymentId: "cs_test_order", status: "failed" },
    }).success,
  ).toBe(false);
});
