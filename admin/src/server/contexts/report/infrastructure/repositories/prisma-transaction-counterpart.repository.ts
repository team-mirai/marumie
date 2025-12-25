import "server-only";

import type { PrismaClient } from "@prisma/client";
import type {
  ITransactionCounterpartRepository,
  TransactionCounterpartData,
} from "@/server/contexts/report/domain/repositories/transaction-counterpart-repository.interface";

export class PrismaTransactionCounterpartRepository implements ITransactionCounterpartRepository {
  constructor(private prisma: PrismaClient) {}

  async findByTransactionId(transactionId: bigint): Promise<TransactionCounterpartData | null> {
    const result = await this.prisma.transactionCounterpart.findUnique({
      where: { transactionId },
    });

    if (!result) {
      return null;
    }

    return {
      transactionId: result.transactionId,
      counterpartId: result.counterpartId,
    };
  }

  async upsert(transactionId: bigint, counterpartId: bigint): Promise<void> {
    await this.prisma.transactionCounterpart.upsert({
      where: { transactionId },
      create: { transactionId, counterpartId },
      update: { counterpartId },
    });
  }

  async deleteByTransactionId(transactionId: bigint): Promise<void> {
    await this.prisma.transactionCounterpart.deleteMany({
      where: { transactionId },
    });
  }

  async deleteByTransactionIds(transactionIds: bigint[]): Promise<void> {
    await this.prisma.transactionCounterpart.deleteMany({
      where: {
        transactionId: { in: transactionIds },
      },
    });
  }

  async createMany(data: TransactionCounterpartData[]): Promise<void> {
    await this.prisma.transactionCounterpart.createMany({
      data: data.map((d) => ({
        transactionId: d.transactionId,
        counterpartId: d.counterpartId,
      })),
    });
  }
}
