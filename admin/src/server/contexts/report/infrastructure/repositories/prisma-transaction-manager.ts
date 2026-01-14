import "server-only";

import type { PrismaClient } from "@prisma/client";
import type {
  ITransactionManager,
  PrismaTransactionClient,
} from "@/server/contexts/report/domain/repositories/transaction-manager.interface";

export class PrismaTransactionManager implements ITransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  async execute<T>(fn: (tx: PrismaTransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        return fn(tx);
      },
      {
        timeout: 30000,
        isolationLevel: "ReadCommitted",
      },
    );
  }
}
