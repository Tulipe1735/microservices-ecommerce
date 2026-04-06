import "dotenv/config";
import { createProducer, createRedisClient } from "@repo/redis";

const redis = createRedisClient("auth-service");

export const producer = createProducer(redis);
