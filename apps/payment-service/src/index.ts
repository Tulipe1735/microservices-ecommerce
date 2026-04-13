import { serve } from "@hono/node-server";
import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import sessionRoute from "./routes/session.route.js";
import webhookRoute from "./routes/webhooks.route.js"; // 改成 payme 回调，但文件名不变
import { consumer, producer } from "./utils/redis.js";
import { runRedisSubscriptions } from "./utils/subscriptions.js";

const app = new Hono();

app.use("*", clerkMiddleware());
app.use("*", cors({ origin: ["http://localhost:3002"] }));

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.route("/sessions", sessionRoute);
app.route("/payme", webhookRoute); // ← 只改这里，"/webhooks" → "/payme"

const start = async () => {
  try {
    await Promise.all([producer.connect(), consumer.connect()]);
    await runRedisSubscriptions();

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
