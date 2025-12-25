import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { ICounterpartAssignmentTransactionRepository } from "@/server/contexts/report/domain/repositories/counterpart-assignment-transaction-repository.interface";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { requiresCounterpartDetail } from "@/server/contexts/report/domain/models/counterpart-assignment-rules";

export class PrismaCounterpartAssignmentTransactionRepository
  implements ICounterpartAssignmentTransactionRepository
{
  constructor(private prisma: PrismaClient) {}

  async existsById(id: bigint): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      select: { id: true },
    });
    return transaction !== null;
  }

  async findExistingIds(ids: bigint[]): Promise<bigint[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return transactions.map((t) => t.id);
  }

  async findByIdWithCounterpart(id: bigint): Promise<TransactionWithCounterpart | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        transactionCounterparts: {
          include: {
            counterpart: true,
          },
        },
      },
    });

    if (!transaction) {
      return null;
    }

    const firstCounterpart = transaction.transactionCounterparts[0];
    const transactionType = transaction.transactionType as "income" | "expense";

    return {
      id: transaction.id.toString(),
      transactionNo: transaction.transactionNo,
      transactionDate: transaction.transactionDate,
      financialYear: transaction.financialYear,
      transactionType,
      categoryKey: transaction.debitAccount,
      friendlyCategory: transaction.friendlyCategory,
      label: transaction.label,
      description: transaction.description,
      memo: transaction.memo,
      debitAmount: Number(transaction.debitAmount),
      creditAmount: Number(transaction.creditAmount),
      debitPartner: transaction.debitPartner,
      creditPartner: transaction.creditPartner,
      counterpart: firstCounterpart
        ? {
            id: firstCounterpart.counterpart.id.toString(),
            name: firstCounterpart.counterpart.name,
            address: firstCounterpart.counterpart.address,
          }
        : null,
      requiresCounterpart: requiresCounterpartDetail(
        transactionType,
        transaction.debitAccount,
        Number(transaction.debitAmount),
      ),
    };
  }
}
