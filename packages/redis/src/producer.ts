import type { RedisClient } from "./client";

export const createProducer = (client: RedisClient) => {
  const connect = async () => {
    if (!client.isOpen) {
      await client.connect();
    }
  };

  const send = async (channel: string, message: object) => {
    await client.publish(channel, JSON.stringify(message));
  };

  const disconnect = async () => {
    if (client.isOpen) {
      await client.quit();
    }
  };

  return { connect, send, disconnect };
};
