import mongoose, { InferSchemaType, model } from "mongoose";
const { Schema } = mongoose;

export const OrderStatus = [
  "pending",
  "processing",
  "success",
  "failed",
] as const;

const OrderSchema = new Schema(
  {
    paymentId: { type: String },
    currency: { type: String, default: "usd" },
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      city: String,
    },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true, enum: OrderStatus },
    products: {
      type: [
        {
          name: { type: String, required: true },
          quantity: { type: Number, required: true },
          price: { type: Number, required: true },
          productId: Number,
          selectedSize: String,
          selectedColor: String,
        },
      ],
      required: true,
    },
  },
  { timestamps: true },
);

OrderSchema.index({ paymentId: 1 }, { unique: true, sparse: true });

export type OrderSchemaType = InferSchemaType<typeof OrderSchema>;

export const Order = model<OrderSchemaType>("Order", OrderSchema);
