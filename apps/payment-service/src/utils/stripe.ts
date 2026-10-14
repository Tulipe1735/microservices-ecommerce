import Stripe from "stripe";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 503 = 400,
  ) {
    super(message);
  }
}

let stripe: Stripe | undefined;
export const getStripe = () => {
  const key = process.env.STRIPE_API_KEY;
  if (!key)
    throw new CheckoutError("Stripe payment service is not configured.", 503);
  return (stripe ??= new Stripe(key, { maxNetworkRetries: 2 }));
};

export const getClientUrl = () => {
  const value =
    process.env.CLIENT_URL ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3002" : "");
  if (
    !URL.canParse(value) ||
    !["http:", "https:"].includes(new URL(value).protocol)
  ) {
    throw new CheckoutError(
      "CLIENT_URL must be configured as an HTTP(S) URL.",
      503,
    );
  }
  return new URL(value).origin;
};
