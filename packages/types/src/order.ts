import { OrderSchemaType } from "@repo/order-db";
import z from "zod";

export type OrderType = OrderSchemaType & {
  _id: string;
};

export const orderStatuses = [
  "pending",
  "processing",
  "success",
  "failed",
] as const;

export const OrderFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required!" }),
  status: z.enum(orderStatuses),
  productName: z.string().min(1, { message: "Product name is required!" }),
  quantity: z
    .number()
    .int()
    .min(1, { message: "Quantity must be at least one" }),
});

export type OrderFormType = z.infer<typeof OrderFormSchema>;

export const CreateOrderSchema = OrderFormSchema.extend({
  userId: z.string().min(1, { message: "User Id is required!" }),
  email: z.email({ message: "Valid email is required!" }),
});

export type CreateOrderType = z.infer<typeof CreateOrderSchema>;

export type OrderChartType = {
  month: string;
  total: number;
  successful: number;
};

export type BestSellerType = {
  name: string;
  quantity: number;
};
