import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let prismaClient = globalForPrisma.prisma;

function getD1Binding(): D1Database | undefined {
  try {
    const context = getCloudflareContext();
    return context.env.DB;
  } catch {
    return undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const log: Prisma.LogLevel[] = process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];
  const db = getD1Binding();

  if (db) {
    return new PrismaClient({
      adapter: new PrismaD1(db),
      log,
    });
  }

  throw new Error("Cloudflare D1 binding DB is not available");
}

function getPrismaClient(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  prismaClient = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
