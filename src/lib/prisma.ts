import { ENV } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  mophNotifyPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  if (!ENV.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const adapter = new PrismaMariaDb(ENV.databaseUrl);

  return new PrismaClient({
    adapter,
    log: ENV.isDevelopment ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.mophNotifyPrisma ?? createPrismaClient();

if (!ENV.isProduction) {
  globalForPrisma.mophNotifyPrisma = prisma;
}
