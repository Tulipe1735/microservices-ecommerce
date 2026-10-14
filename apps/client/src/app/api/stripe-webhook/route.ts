export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The Docker payment service verifies the original Stripe signature and body.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature.", { status: 400 });

  const serviceUrl = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL;
  if (!serviceUrl)
    return new Response("Payment service is unavailable.", { status: 503 });

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 1_048_576)
      return new Response("Webhook payload is too large.", { status: 413 });

    const upstream = await fetch(`${serviceUrl.replace(/\/$/, "")}/webhooks/`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
        "stripe-signature": signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      redirect: "error",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error(
      "Stripe webhook forwarding failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return new Response("Payment service is temporarily unavailable.", {
      status: 502,
    });
  }
}
