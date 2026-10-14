import { randomBytes } from "node:crypto";
import { prisma as productDb } from "@repo/product-db";
import { shippingFormSchema } from "@repo/types";
import Stripe from "stripe";
import { z } from "zod";
import { CheckoutError, getClientUrl } from "./stripe.js";

const cartItemSchema = z.object({
  id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  selectedSize: z.string().min(1).max(64),
  selectedColor: z.string().min(1).max(64),
});
export const checkoutSchema = z.object({
  cart: z
    .array(cartItemSchema)
    .min(1)
    .max(100)
    .superRefine((items, ctx) => {
      const keys = items.map((item) =>
        JSON.stringify([item.id, item.selectedSize, item.selectedColor]),
      );
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({ code: "custom", message: "Duplicate cart items." });
    }),
  shippingForm: shippingFormSchema.extend({
    name: z.string().trim().min(1).max(100),
    address: z.string().trim().min(1).max(300),
    city: z.string().trim().min(1).max(100),
  }),
});
export const savedCartSchema = z
  .array(
    cartItemSchema.extend({
      name: z.string().min(1),
      price: z.number().int().positive(),
    }),
  )
  .min(1);

const integrationIdentifier = `pulse_alipay_${Array.from(
  randomBytes(8),
  (byte) => String.fromCharCode(97 + (byte % 26)),
).join("")}`;

export const buildCart = async (
  input: z.infer<typeof checkoutSchema>["cart"],
) => {
  const products = await productDb.product.findMany({
    where: { id: { in: input.map((item) => item.id) } },
  });
  const cart = input.map((item) => {
    const product = products.find((product) => product.id === item.id);
    if (
      !product ||
      !product.sizes.includes(item.selectedSize) ||
      !product.colors.includes(item.selectedColor)
    ) {
      throw new CheckoutError(
        "A product or selected variant is no longer available.",
      );
    }
    if (!Number.isSafeInteger(product.price) || product.price <= 0)
      throw new CheckoutError("A product price is invalid.");
    return { ...item, name: product.name, price: product.price };
  });
  const amount = cart.reduce(
    (total, item) => total + item.price * 100 * item.quantity,
    0,
  );
  if (!Number.isSafeInteger(amount) || amount > 99_999_999)
    throw new CheckoutError(
      "The order total exceeds the supported payment amount.",
    );
  return { cart, amount };
};

export const checkoutParameters = (
  checkoutId: string,
  userId: string,
  cart: z.infer<typeof savedCartSchema>,
): Stripe.Checkout.SessionCreateParams => ({
  mode: "payment",
  // Filter dynamic methods to Alipay; account eligibility and activation still apply.
  allowed_payment_method_types: ["alipay"],
  payment_method_configuration:
    process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID || undefined,
  adaptive_pricing: { enabled: false },
  integration_identifier: integrationIdentifier,
  client_reference_id: checkoutId,
  metadata: { integration: "pulse", checkoutId, userId },
  success_url: `${getClientUrl()}/return?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${getClientUrl()}/checkout?step=2&cancelled=true`,
  line_items: cart.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: "usd",
      unit_amount: item.price * 100,
      product_data: {
        name: item.name,
        description: `Size: ${item.selectedSize}; Color: ${item.selectedColor}`,
      },
    },
  })),
});
