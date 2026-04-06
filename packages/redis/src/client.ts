import { createClient, type RedisClientType } from "redis";

export type RedisClient = RedisClientType;

export const createRedisClient = (_service: string): RedisClient => {
  return createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  });
};
