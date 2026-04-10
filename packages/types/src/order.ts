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
  amount: z.number().min(1, { message: "Amount must be at least one" }),
  userId: z.string().min(1, { message: "User Id is required!" }),
  email: z.email({ message: "Valid email is required!" }),
  status: z.enum(orderStatuses),
  productName: z.string().min(1, { message: "Product name is required!" }),
  quantity: z.number().int().min(1, { message: "Quantity must be at least one" }),
});

export type OrderFormType = z.infer<typeof OrderFormSchema>;

export type OrderChartType = {
  month: string;
  total: number;
  successful: number;
};

export type BestSellerType = {
  name: string;
  quantity: number;
};
