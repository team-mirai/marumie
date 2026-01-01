import "server-only";

import type { PrismaClient } from "@prisma/client";
import type {
  ITransactionDonorRepository,
  TransactionDonorData,
} from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";

export class PrismaTransactionDonorRepository implements ITransactionDonorRepository {
  constructor(private prisma: PrismaClient) {}

  async findByTransactionId(transactionId: bigint): Promise<TransactionDonorData | null> {
    const result = await this.prisma.transactionDonor.findUnique({
      where: { transactionId },
    });

    if (!result) {
      return null;
    }

    return {
      transactionId: result.transactionId,
      donorId: result.donorId,
    };
  }

  async upsert(transactionId: bigint, donorId: bigint): Promise<void> {
    await this.prisma.transactionDonor.upsert({
      where: { transactionId },
      create: { transactionId, donorId },
      update: { donorId },
    });
  }

  async deleteByTransactionId(transactionId: bigint): Promise<void> {
    await this.prisma.transactionDonor.deleteMany({
      where: { transactionId },
    });
  }

  async deleteByTransactionIds(transactionIds: bigint[]): Promise<void> {
    await this.prisma.transactionDonor.deleteMany({
      where: {
        transactionId: { in: transactionIds },
      },
    });
  }

  async createMany(data: TransactionDonorData[]): Promise<void> {
    if (data.length === 0) {
      return;
    }
    await this.prisma.transactionDonor.createMany({
      data: data.map((d) => ({
        transactionId: d.transactionId,
        donorId: d.donorId,
      })),
    });
  }

  async replaceMany(transactionIds: bigint[], data: TransactionDonorData[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.transactionDonor.deleteMany({
        where: {
          transactionId: { in: transactionIds },
        },
      });

      if (data.length === 0) {
        return;
      }
      await tx.transactionDonor.createMany({
        data: data.map((d) => ({
          transactionId: d.transactionId,
          donorId: d.donorId,
        })),
      });
    });
  }
}
