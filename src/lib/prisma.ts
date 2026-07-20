import { PrismaClient } from "@prisma/client";

// Singleton de PrismaClient. En dev, Next recarga modulos en cada cambio;
// sin el singleton se abririan multiples clientes y se agotaria el pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
