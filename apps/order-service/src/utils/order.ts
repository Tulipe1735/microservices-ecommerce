import { Order } from "@repo/order-db";
import { producer } from "./redis";
import { z } from "zod";

export const paidOrderSchema = z.object({
  value: z.object({
    paymentId: z.string().min(1),
    userId: z.string().min(1),
    username: z.string().min(1),
    email: z.email(),
    amount: z.number().positive(),
    currency: z.literal("usd"),
    status: z.literal("success"),
    shippingAddress: z.object({
      name: z.string(),
      phone: z.string(),
      address: z.string(),
      city: z.string(),
    }),
    products: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          name: z.string().min(1),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
          selectedSize: z.string(),
          selectedColor: z.string(),
        }),
      )
      .min(1),
  }),
});

type CreateOrderInput = {
  paymentId?: string;
  currency?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  userId: string;
  username: string;
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
  try {
    if (order.paymentId) {
      const result = await Order.updateOne(
        { paymentId: order.paymentId },
        { $setOnInsert: order },
        { upsert: true, runValidators: true },
      );
      if (result.upsertedCount === 0) return;
    } else {
      await new Order(order).save();
    }
    await producer.send("order.created", {
      value: {
        email: order.email,
        amount: order.amount,
        status: order.status,
      },
    });
  } catch (error) {
    if (
      order.paymentId &&
      error instanceof Error &&
      "code" in error &&
      error.code === 11000
    )
      return;
    console.log(error);
    throw error;
  }
};
