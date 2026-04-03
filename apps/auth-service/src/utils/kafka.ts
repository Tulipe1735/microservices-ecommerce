import "dotenv/config"; // 必须在其他 import 之前
import { createKafkaClient, createProducer } from "@repo/kafka";

const kafka = createKafkaClient("email-service");
export const producer = createProducer(kafka);
