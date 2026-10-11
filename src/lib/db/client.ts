import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: without this, hot-reloading
// re-instantiates PrismaClient on every edit and exhausts Postgres
// connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
