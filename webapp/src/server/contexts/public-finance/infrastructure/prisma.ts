import "server-only";

// Prisma クライアントは全コンテキストで1つを共有する。
// 既存の参照パスを維持するため、ここでは shared の実体を再輸出するだけにしている。
export { prisma } from "@/server/contexts/shared/infrastructure/prisma";
