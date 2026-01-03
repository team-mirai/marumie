import type { PrismaClient } from "@prisma/client";

export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface ITransactionManager {
  execute<T>(fn: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
