import { consumer } from "./redis";
import { createOrder } from "./order";

export const runRedisSubscriptions = async () => {
  await consumer.subscribe([
    {
      topicName: "payment.successful",
      topicHandler: async (message) => {
        const order = message.value;
        await createOrder(order);
      },
    },
  ]);
};
