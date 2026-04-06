import { createConsumer, createProducer, createRedisClient } from "@repo/redis";

const redisClient = createRedisClient("order-service");

export const producer = createProducer(redisClient);
export const consumer = createConsumer(redisClient, "order-group");
