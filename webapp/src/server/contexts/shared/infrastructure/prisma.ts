import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 全コンテキストで共有する Prisma クライアント。
 *
 * コンテキストごとにクライアントを作るとコネクションプールが分かれ、
 * サーバーレス環境で接続上限に当たりやすくなるため、1つに集約する。
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
