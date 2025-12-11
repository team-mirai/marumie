import type { PrismaClient } from "@prisma/client";
import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  IReportTransactionRepository,
  IncomeTransactionFilters,
  LoanIncomeTransaction,
  OtherIncomeTransaction,
} from "./interfaces/report-transaction-repository.interface";

// カテゴリキー定数
const CATEGORY_KEYS = {
  BUSINESS: "publication-income",
  LOAN: "loan-income",
  GRANT: "grant-income",
  OTHER: "other-income",
} as const;

export class PrismaReportTransactionRepository
  implements IReportTransactionRepository
{
  constructor(private prisma: PrismaClient) {}

  /**
   * SYUUSHI07_03: 事業による収入のトランザクションを取得
   */
  async findBusinessIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<BusinessIncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: CATEGORY_KEYS.BUSINESS,
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
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
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
    }));
  }

  /**
   * SYUUSHI07_04: 借入金のトランザクションを取得
   */
  async findLoanIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<LoanIncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: CATEGORY_KEYS.LOAN,
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
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
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
      transactionDate: t.transactionDate,
      // TODO: CounterPartテーブル実装後に実際の値を取得する
      counterpartName: "（仮）取引先名称",
      counterpartAddress: "（仮）東京都千代田区永田町1-1-1",
    }));
  }

  /**
   * SYUUSHI07_05: 交付金のトランザクションを取得
   */
  async findGrantIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<GrantIncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: CATEGORY_KEYS.GRANT,
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
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
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
      transactionDate: t.transactionDate,
      // TODO: CounterPartテーブル実装後に実際の値を取得する
      counterpartName: "（仮）本部名称",
      counterpartAddress: "（仮）東京都千代田区永田町1-1-1",
    }));
  }

  /**
   * SYUUSHI07_06: その他の収入のトランザクションを取得
   */
  async findOtherIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<OtherIncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: CATEGORY_KEYS.OTHER,
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
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
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
    }));
  }
}
