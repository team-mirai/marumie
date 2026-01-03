import "server-only";

import type { PrismaClient } from "@prisma/client";
import type {
  ITransactionDonorRepository,
  TransactionDonorData,
} from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";
import type { PrismaTransactionClient } from "@/server/contexts/report/domain/repositories/transaction-manager.interface";

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

  async bulkUpsert(
    pairs: { transactionId: bigint; donorId: bigint }[],
    tx?: PrismaTransactionClient,
  ): Promise<void> {
    if (pairs.length === 0) {
      return;
    }

    const client = tx ?? this.prisma;

    const valuesClauses: string[] = [];
    const params: (bigint | Date)[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const txIdParam = i * 2 + 1;
      const donorIdParam = i * 2 + 2;
      valuesClauses.push(`($${txIdParam}, $${donorIdParam}, NOW(), NOW())`);
      params.push(pair.transactionId, pair.donorId);
    }

    const sql = `
      INSERT INTO "TransactionDonor" ("transactionId", "donorId", "createdAt", "updatedAt")
      VALUES ${valuesClauses.join(", ")}
      ON CONFLICT ("transactionId")
      DO UPDATE SET
        "donorId" = EXCLUDED."donorId",
        "updatedAt" = NOW()
    `;

    await client.$executeRawUnsafe(sql, ...params);
  }
}
