import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { ITransactionCounterpartRepository } from "@/server/contexts/report/domain/repositories/transaction-counterpart-repository.interface";

export class PrismaTransactionCounterpartRepository implements ITransactionCounterpartRepository {
  constructor(private prisma: PrismaClient) {}

  async deleteByTransactionIds(transactionIds: bigint[]): Promise<void> {
    await this.prisma.transactionCounterpart.deleteMany({
      where: {
        transactionId: { in: transactionIds },
      },
    });
  }
}
