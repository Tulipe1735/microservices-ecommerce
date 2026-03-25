import { Request, Response } from "express";
import { prisma, Prisma } from "@repo/product-db";
import { producer } from "../utils/kafka";
import { StripeProductType } from "@repo/types";

// 创建产品
export const createProduct = async (req: Request, res: Response) => {
  const data: Prisma.ProductCreateInput = req.body;

  const { images } = data;

  if (!images || typeof images !== "object") {
    return res.status(400).json({ message: "Images object is required!" });
  }

  // 异步创建product
  const product = await prisma.product.create({ data });

  const stripeProduct: StripeProductType = {
    id: product.id.toString(),
    name: product.name,
    price: product.price,
  };

  producer.send("product.created", { value: stripeProduct });
  res.status(201).json(product);
};

// 更新产品
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: Prisma.ProductUpdateInput = req.body;

  const updatedProduct = await prisma.product.update({
    where: { id: Number(id) },
    data,
  });

  return res.status(200).json(updatedProduct);
};

// 删除产品
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedProduct = await prisma.product.delete({
    where: { id: Number(id) },
  });

  producer.send("product.deleted", { value: Number(id) });

  return res.status(200).json(deletedProduct);
};

// 查找所有产品
export const getProducts = async (req: Request, res: Response) => {
  const { sort, category, search, limit } = req.query; //?=所以用query
  // 2:24:03
  // 按照不同的顺序查找
  const orderBy = (() => {
    switch (sort) {
      case "asc":
        return { price: Prisma.SortOrder.asc };
        break;
      case "desc":
        return { price: Prisma.SortOrder.desc };
        break;
      case "oldest":
        return { createdAt: Prisma.SortOrder.asc };
        break;
      default:
        return { createdAt: Prisma.SortOrder.desc };
        break;
    }
  })();

  // 查找产品
  const products = await prisma.product.findMany({
    where: {
      // 按种类查找
      category: {
        slug: category as string,
      },
      // 按名字查找
      name: {
        contains: search as string,
        mode: "insensitive", //大小写均可
      },
    },
    orderBy,
    take: limit ? Number(limit) : undefined,
  });

  res.status(200).json(products);
};

// 查找单一产品
export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params; //slash/id所以用params

  // 查找单个产品
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
  });

  return res.status(200).json(product);
};
