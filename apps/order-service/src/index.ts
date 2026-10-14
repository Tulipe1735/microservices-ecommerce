import "dotenv/config";
import Fastify from "fastify";
import Clerk from "@clerk/fastify";
import { shouldBeUser } from "./middleware/authMiddleware.js";
import { connectOrderDB, Order } from "@repo/order-db";
import { orderRoute } from "./routes/order.js";
import { consumer, producer } from "./utils/redis.js";
import { runRedisSubscriptions } from "./utils/subscriptions.js";

const fastify = Fastify();

fastify.addHook("onRequest", async (request, reply) => {
  const origin = request.headers.origin;
  const allowedOrigins = [
    process.env.CLIENT_URL ?? "http://localhost:3002",
    process.env.ADMIN_URL ?? "http://localhost:3003",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    reply.header("Access-Control-Allow-Origin", origin);
  }

  reply.header("Access-Control-Allow-Credentials", "true");
  reply.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    return reply.status(204).send();
  }
});

fastify.register(Clerk.clerkPlugin);

fastify.get("/health", (request, reply) => {
  return reply.status(200).send({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

fastify.get("/test", { preHandler: shouldBeUser }, (request, reply) => {
  return reply.send({
    message: "Order service is authenticated!",
    userId: request.userId,
  });
});

fastify.register(orderRoute);

const start = async () => {
  try {
    await Promise.all([
      connectOrderDB(),
      producer.connect(),
      consumer.connect(),
    ]);
    await Order.init();
    await runRedisSubscriptions();
    await fastify.listen({ port: 8001, host: "0.0.0.0" });
    console.log("Order service is running on port 8001");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

start();
