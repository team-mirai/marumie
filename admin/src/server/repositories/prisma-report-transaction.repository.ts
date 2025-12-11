import type { PrismaClient } from "@prisma/client";
import type {
  IReportTransactionRepository,
  IncomeTransaction,
  IncomeTransactionFilters,
  IncomeTransactionWithCounterpart,
} from "./interfaces/report-transaction-repository.interface";

export class PrismaReportTransactionRepository
  implements IReportTransactionRepository
{
  constructor(private prisma: PrismaClient) {}

  /**
   * business, other 用のトランザクションを取得（counterpart なし）
   */
  async findIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: {
          in: ["publication-income", "other-income"],
        },
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
        categoryKey: true,
        friendlyCategory: true,
        label: true,
        description: true,
        memo: true,
        debitAmount: true,
        creditAmount: true,
      },
    });

    return transactions.map((t) => ({
      transactionNo: t.transactionNo,
      categoryKey: t.categoryKey,
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
    }));
  }

  /**
   * loan, grant 用のトランザクションを取得（counterpart あり）
   */
  async findIncomeTransactionsWithCounterpart(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransactionWithCounterpart[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: {
          in: ["loan-income", "grant-income"],
        },
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
        categoryKey: true,
        friendlyCategory: true,
        label: true,
        description: true,
        memo: true,
        debitAmount: true,
        creditAmount: true,
        transactionDate: true,
      },
    });

    return transactions.map((t) => ({
      transactionNo: t.transactionNo,
      categoryKey: t.categoryKey,
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
      transactionDate: t.transactionDate ?? new Date(),
      // TODO: CounterPartテーブル実装後に実際の値を取得する
      counterpartName: "（仮）取引先名称",
      counterpartAddress: "（仮）東京都千代田区永田町1-1-1",
    }));
  }
}
