import type { RedisClient } from "./client";

type TopicConfig = {
  topicName: string;
  topicHandler: (message: any) => Promise<void>;
};

export const createConsumer = (client: RedisClient, groupId: string) => {
  const subscriber = client.duplicate();

  const connect = async () => {
    if (!subscriber.isOpen) {
      await subscriber.connect();
      console.log("Redis subscriber connected:" + groupId);
    }
  };

  const subscribe = async (topics: TopicConfig[]) => {
    await Promise.all(
      topics.map(({ topicName, topicHandler }) =>
        subscriber.subscribe(topicName, async (message) => {
          try {
            await topicHandler(JSON.parse(message));
          } catch (error) {
            console.log("Error processing message", error);
          }
        }),
      ),
    );
  };

  const disconnect = async () => {
    if (subscriber.isOpen) {
      await subscriber.quit();
    }
  };

  return { connect, subscribe, disconnect };
};
