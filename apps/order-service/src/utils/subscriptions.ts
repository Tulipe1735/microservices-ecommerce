import { consumer } from "./redis";
import { createOrder, paidOrderSchema } from "./order";

export const runRedisSubscriptions = async () => {
  await consumer.subscribe([
    {
      topicName: "payment.successful",
      topicHandler: async (message) => {
        const { value: order } = paidOrderSchema.parse(message);
        await createOrder(order);
      },
    },
  ]);
};
