import { createConsumer, createProducer, createRedisClient } from "@repo/redis";

const redisClient = createRedisClient("payment-service");

export const producer = createProducer(redisClient);
export const consumer = createConsumer(redisClient, "payment-group");
