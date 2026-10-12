import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 *
 * Ensures a single shared instance of PrismaClient across hot module reloads in development
 * and handles serverless connection lifecycles on platforms like Vercel.
 */

declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["error", "warn"],
  });
} else {
  if (!global.__dbInstance) {
    global.__dbInstance = new PrismaClient({
      log: ["warn", "error"],
    });
  }
  prisma = global.__dbInstance;
}

export { prisma };
