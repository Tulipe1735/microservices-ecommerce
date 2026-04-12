import { Request, Response } from "express";
import { BestSellerType, StripeProductType } from "@repo/types";
import { Prisma, prisma } from "@repo/product-db";
import { producer } from "../utils/redis";

const publishProductEvent = async (topic: string, value: unknown) => {
  try {
    await producer.send(topic, { value });
  } catch (error) {
    console.error(`Failed to publish Redis event: ${topic}`, error);
  }
};

const getPopularProducts = async (limit?: number) => {
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL ?? process.env.NEXT_PUBLIC_ORDER_SERVICE_URL;

  if (!orderServiceUrl) {
    return [];
  }

  const query = new URLSearchParams();

  if (limit) {
    query.set("limit", String(limit));
  }

  const response = await fetch(
    `${orderServiceUrl}/best-sellers?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch best sellers: ${response.status}`);
  }

  const bestSellers: BestSellerType[] = await response.json();
  const bestSellerNames = bestSellers.map((item) => item.name);

  if (bestSellerNames.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      name: {
        in: bestSellerNames,
      },
    },
  });

  const productByName = new Map(
    products.map((product) => [product.name, product]),
  );

  return bestSellerNames
    .map((name) => productByName.get(name))
    .filter((product): product is NonNullable<typeof product> =>
      Boolean(product),
    );
};

// 创建产品
export const createProduct = async (req: Request, res: Response) => {
  const data: Prisma.ProductCreateInput = req.body;

  const { colors, images } = data;
  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    return res.status(400).json({ message: "Colors array is required!" });
  }

  if (!images || typeof images !== "object") {
    return res.status(400).json({ message: "Images object is required!" });
  }

  const missingColors = colors.filter((color) => !(color in images));

  if (missingColors.length > 0) {
    return res
      .status(400)
      .json({ message: "Missing images for colors!", missingColors });
  }

  const product = await prisma.product.create({ data });

  const stripeProduct: StripeProductType = {
    id: product.id.toString(),
    name: product.name,
    price: product.price,
  };

  producer.send("product.created", { value: stripeProduct });
  res.status(201).json(product);
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: Prisma.ProductUpdateInput = req.body;

  const updatedProduct = await prisma.product.update({
    where: { id: Number(id) },
    data,
  });

  return res.status(200).json(updatedProduct);
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedProduct = await prisma.product.delete({
    where: { id: Number(id) },
  });

  await publishProductEvent("product.deleted", Number(id));

  return res.status(200).json(deletedProduct);
};

export const getProducts = async (req: Request, res: Response) => {
  const { sort, category, search } = req.query;

  const orderBy = (() => {
    switch (sort) {
      case "asc":
        return { price: Prisma.SortOrder.asc };
      case "desc":
        return { price: Prisma.SortOrder.desc };
      case "oldest":
        return { createdAt: Prisma.SortOrder.asc };
      default:
        return { createdAt: Prisma.SortOrder.desc };
    }
  })();

  const normalizedCategory =
    typeof category === "string" && category !== "all" ? category : undefined;
  const normalizedSearch = typeof search === "string" ? search : undefined;

  const products = await prisma.product.findMany({
    where: {
      ...(normalizedCategory ? { categorySlug: normalizedCategory } : {}),
      ...(normalizedSearch
        ? {
            name: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy,
  });

  return res.status(200).json(products);
};

export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
  });

  return res.status(200).json(product);
};
