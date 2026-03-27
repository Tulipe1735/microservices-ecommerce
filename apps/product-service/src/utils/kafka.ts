import { createConsumer, createKafkaClient, createProducer } from "@repo/kafka";

//创建kafka实例
const kafkaClient = createKafkaClient("product-service");

export const producer = createProducer(kafkaClient);
export const consumer = createConsumer(kafkaClient, "product-group");
