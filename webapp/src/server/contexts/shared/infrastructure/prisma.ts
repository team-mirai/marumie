import "server-only";

import { type Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 本番では公開ページのアクセスごとに実行 SQL が標準出力へ出てしまうため、クエリログは開発・テストだけで有効にする。
const logLevels: Prisma.LogLevel[] = process.env.NODE_ENV === "production" ? [] : ["query"];

/**
 * 全コンテキストで共有する Prisma クライアント。
 *
 * コンテキストごとにクライアントを作るとコネクションプールが分かれ、
 * サーバーレス環境で接続上限に当たりやすくなるため、1つに集約する。
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
