import { Kafka } from "kafkajs";
import fs from "fs";
import path from "path";

export const createKafkaClient = (service: string) => {
  return new Kafka({
    clientId: service,
    brokers: [process.env.KAFKA_BROKER!],
    ssl: {
      ca: [fs.readFileSync(path.resolve(process.env.KAFKA_SSL_CA!), "utf-8")],
      cert: fs.readFileSync(path.resolve(process.env.KAFKA_SSL_CERT!), "utf-8"),
      key: fs.readFileSync(path.resolve(process.env.KAFKA_SSL_KEY!), "utf-8"),
    },
  });
};
