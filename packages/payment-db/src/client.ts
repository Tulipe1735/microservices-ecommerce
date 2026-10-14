import { PrismaClient } from "../generated/prisma";

const globalForPrisma = global as unknown as { paymentPrisma: PrismaClient };

export const prisma = globalForPrisma.paymentPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForPrisma.paymentPrisma = prisma;
