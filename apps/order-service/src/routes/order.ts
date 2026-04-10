import { FastifyInstance } from "fastify";
import { shouldBeAdmin, shouldBeUser } from "../middleware/authMiddleware";
import { Order } from "@repo/order-db";
import { startOfMonth, subMonths } from "date-fns";
import {
  BestSellerType,
  OrderChartType,
  OrderFormSchema,
  OrderFormType,
} from "@repo/types";
import { createOrder } from "../utils/order";

// fetch orders
export const orderRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    "/orders",
    { preHandler: shouldBeAdmin },
    async (request, reply) => {
      const parsed = OrderFormSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          message: "Invalid order payload.",
          errors: parsed.error.flatten(),
        });
      }

      const data: OrderFormType = parsed.data;

      await createOrder({
        userId: data.userId,
        email: data.email,
        amount: data.amount,
        status: data.status,
        products: [
          {
            name: data.productName,
            quantity: data.quantity,
            price: data.amount,
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
