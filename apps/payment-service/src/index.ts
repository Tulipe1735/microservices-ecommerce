import { serve } from "@hono/node-server";
import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import sessionRoute from "./routes/session.route.js";
import webhookRoute from "./routes/webhooks.route.js";
import { producer } from "./utils/redis.js";
import { getClientUrl } from "./utils/stripe.js";

const app = new Hono({ strict: false });

app.use("/sessions/*", cors({ origin: [getClientUrl()] }));
app.use(
  "/sessions/*",
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey:
      process.env.CLERK_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }),
);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.route("/sessions", sessionRoute);
app.route("/webhooks", webhookRoute);

const start = async () => {
  try {
    await producer.connect();

    serve(
      {
        fetch: app.fetch,
        port: 8002,
      },
      () => {
        console.log("Payment service is running on port 8002");
      },
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

start();
