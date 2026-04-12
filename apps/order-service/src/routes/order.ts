import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { Order } from "@repo/order-db";
import { startOfMonth, subMonths } from "date-fns";
import {
  BestSellerType,
  CreateOrderSchema,
  CreateOrderType,
  OrderChartType,
} from "@repo/types";
import { createOrder } from "../utils/order";

const getProductPriceByName = async (productName: string) => {
  const productServiceUrl =
    process.env.PRODUCT_SERVICE_URL?.trim() ??
    process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL?.trim();

  if (!productServiceUrl) {
    throw new Error("PRODUCT_SERVICE_URL is not configured.");
  }

  const query = new URLSearchParams({
    search: productName,
  });

  const response = await fetch(
    `${productServiceUrl}/products?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch product details for "${productName}".`);
  }

  const products = (await response.json()) as Array<{
    name: string;
    price: number;
  }>;

  const normalizedProductName = productName.trim().toLowerCase();
  const matchedProduct =
    products.find(
      (product) => product.name.trim().toLowerCase() === normalizedProductName,
    ) ?? products[0];

  if (!matchedProduct) {
    throw new Error(`Product "${productName}" not found.`);
  }

  return matchedProduct.price;
};

// fetch orders
export const orderRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    "/orders",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const parsed = CreateOrderSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          message: "Invalid order payload.",
          errors: parsed.error.flatten(),
        });
      }

      const data: CreateOrderType = parsed.data;
      const unitPrice = await getProductPriceByName(data.productName);
      const amount = unitPrice * data.quantity;

      await createOrder({
        userId: data.userId,
        username: data.username,
        email: data.email,
        amount,
        status: data.status,
        products: [
          {
            name: data.productName,
            quantity: data.quantity,
            price: unitPrice,
          },
        ],
      });

      return reply.status(201).send({ message: "Order created successfully." });
    },
  );

  fastify.get(
    "/user-orders",
    { preHandler: shouldBeUser }, //这里有个中间件，登录才能用这个功能
    async (request, reply) => {
      const orders = await Order.find({ userId: request.userId });
      return reply.send(orders);
    },
  );
  fastify.get(
    "/orders",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const { limit } = request.query as { limit: number };
      const orders = await Order.find().limit(limit).sort({ createdAt: -1 }); //return latest items
      return reply.send(orders);
    },
  );
  // 客户删除
  fastify.delete(
    "/user-orders/:id",
    { preHandler: shouldBeUser },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const order = await Order.findById(id);

      if (!order) {
        return reply.status(404).send({ message: "Order not found." });
      }

      // 只能删自己的
      if (order.userId !== request.userId) {
        return reply.status(403).send({ message: "Forbidden." });
      }

      // 48小时限制
      const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
      if (Date.now() - new Date(order.createdAt).getTime() > TWO_DAYS_MS) {
        return reply.status(400).send({ message: "Delete window expired." });
      }

      await Order.findByIdAndDelete(id);
      return reply.send({ message: "Order deleted." });
    },
  );
  // admin删除
  fastify.delete(
    "/orders/:id",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const deletedOrder = await Order.findByIdAndDelete(id);

      if (!deletedOrder) {
        return reply.status(404).send({ message: "Order not found." });
      }

      return reply.send(deletedOrder);
    },
  );
  fastify.get("/best-sellers", async (request, reply) => {
    const { limit } = request.query as { limit?: string | number };
    const parsedLimit = Number(limit ?? 5);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, 20))
      : 5;

    const bestSellers = await Order.aggregate<BestSellerType>([
      {
        $match: {
          status: "success",
        },
      },
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: "$products.name",
          quantity: { $sum: "$products.quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          quantity: 1,
        },
      },
      {
        $sort: { quantity: -1, name: 1 },
      },
      {
        $limit: safeLimit,
      },
    ]);

    return reply.send(bestSellers);
  });
  // get last 6 months orders
  fastify.get(
    "/order-chart",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const now = new Date();
      const sixMonthsAgo = startOfMonth(subMonths(now, 5));

      // { month: "April", total: 173, successful: 100 } return stuff

      // MongoDB aggregate
      const raw = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: sixMonthsAgo, $lte: now },
          },
        },
        // MongoDB group
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            total: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [{ $eq: ["$status", "success"] }, 1, 0],
                // {
                //   "year":2025,
                //   "month":9,
                //   "total":100,
                //   "successful":72
                // }
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            total: 1,
            successful: 1,
          },
        },
        {
          $sort: { year: 1, month: 1 },
        },
      ]);

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const results: OrderChartType[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const match = raw.find(
          (item) => item.year === year && item.month === month,
        );

        results.push({
          month: monthNames[month - 1] as string,
          total: match ? match.total : 0,
          successful: match ? match.successful : 0,
        });
      }

      return reply.send(results);
    },
  );
};
