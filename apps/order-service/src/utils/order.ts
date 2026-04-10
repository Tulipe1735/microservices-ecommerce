import { Order } from "@repo/order-db";
import { producer } from "./redis";

type CreateOrderInput = {
  userId: string;
  email: string;
  amount: number;
  status: "pending" | "processing" | "success" | "failed";
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
};

export const createOrder = async (order: CreateOrderInput) => {
  const newOrder = new Order(order);

  try {
    const order = await newOrder.save();
    await producer.send("order.created", {
      value: {
        email: order.email,
        amount: order.amount,
        status: order.status,
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};
