import { randomUUID } from "node:crypto";
import type { RedisClient } from "./client";

type Topic = {
  topicName: string;
  topicHandler: (message: unknown) => Promise<void>;
};

export const createStreamConsumer = (client: RedisClient, groupId: string) => {
  const subscriber = client.duplicate();
  const consumerId = randomUUID();
  let running = false;
  let task: Promise<void> | undefined;
  subscriber.on("error", (error) =>
    console.error("Redis stream connection failed:", error.message),
  );
  const connect = async () => {
    if (!subscriber.isOpen) await subscriber.connect();
  };
  const deliver = async (
    topic: Topic,
    messages: { id: string; message: Record<string, string> }[],
  ) => {
    for (const message of messages) {
      try {
        await topic.topicHandler(JSON.parse(message.message.payload ?? ""));
        await subscriber.xAck(`stream:${topic.topicName}`, groupId, message.id);
      } catch (error) {
        // Leave failures pending; XAUTOCLAIM retries them, including after a restart.
        console.error(
          "Payment event remains pending:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  };
  const subscribe = async (topics: Topic[]) => {
    if (running || topics.length === 0) return;
    for (const topic of topics) {
      try {
        await subscriber.xGroupCreate(
          `stream:${topic.topicName}`,
          groupId,
          "0",
          { MKSTREAM: true },
        );
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("BUSYGROUP"))
          throw error;
      }
    }
    running = true;
    task = (async () => {
      while (running) {
        try {
          for (const topic of topics) {
            let cursor = "0-0";
            do {
              const pending = await subscriber.xAutoClaim(
                `stream:${topic.topicName}`,
                groupId,
                consumerId,
                60_000,
                cursor,
                { COUNT: 20 },
              );
              await deliver(
                topic,
                pending.messages.filter((message) => message !== null),
              );
              cursor = pending.nextId;
            } while (running && cursor !== "0-0");
          }
          const streams = await subscriber.xReadGroup(
            groupId,
            consumerId,
            topics.map((topic) => ({
              key: `stream:${topic.topicName}`,
              id: ">",
            })),
            { BLOCK: 5_000, COUNT: 20 },
          );
          for (const stream of streams ?? []) {
            const topic = topics.find(
              (topic) => `stream:${topic.topicName}` === stream.name,
            );
            if (topic) await deliver(topic, stream.messages);
          }
        } catch (error) {
          if (running) {
            console.error(
              "Redis stream read failed:",
              error instanceof Error ? error.message : "Unknown error",
            );
            await new Promise((resolve) => setTimeout(resolve, 1_000));
          }
        }
      }
    })();
  };
  const disconnect = async () => {
    running = false;
    await task;
    if (subscriber.isOpen) await subscriber.quit();
  };
  return { connect, subscribe, disconnect };
};
