import { consumer } from "./redis.js";

export const runRedisSubscriptions = async () => {
  // product.created / product.deleted 不再需要同步到 Stripe
  // 如果将来需要监听其他服务的消息，在这里添加
  await consumer.subscribe([]);
};
