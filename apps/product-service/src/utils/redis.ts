import { createConsumer, createProducer, createRedisClient } from "@repo/redis";

const redisClient = createRedisClient("product-service");

export const producer = createProducer(redisClient);
export const consumer = createConsumer(redisClient, "product-group");
