import { Kafka } from "kafkajs";

export const createKafkaClient = (service: string) => {
  // 创建kafka实例
  return new Kafka({
    clientId: service,
    brokers: ["localhost:9094", "localhost:9095", "localhost:9096"], //kafka服务器节点
  });
};
