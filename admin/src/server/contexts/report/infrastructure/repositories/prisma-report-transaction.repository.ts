import "server-only";

import type { PrismaClient } from "@prisma/client";
import type {
  BusinessIncomeTransaction,
  GrantIncomeTransaction,
  IReportTransactionRepository,
  LoanIncomeTransaction,
  OfficeExpenseTransaction,
  OtherIncomeTransaction,
  PersonalDonationTransaction,
  SuppliesExpenseTransaction,
  TransactionFilters,
  UtilityExpenseTransaction,
} from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";

// カテゴリキー定数（shared/utils/category-mapping.ts の日本語キー経由で取得）
const CATEGORY_KEYS = {
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  INDIVIDUAL_DONATION: PL_CATEGORIES["個人からの寄附"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  BUSINESS: PL_CATEGORIES["機関紙誌の発行その他の事業による収入"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  LOAN: PL_CATEGORIES["借入金"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  GRANT: PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  OTHER: PL_CATEGORIES["その他の収入"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  UTILITIES: PL_CATEGORIES["光熱水費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  EQUIPMENT_SUPPLIES: PL_CATEGORIES["備品・消耗品費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  OFFICE_EXPENSES: PL_CATEGORIES["事務所費"].key,
} as const;

export class PrismaReportTransactionRepository
  implements IReportTransactionRepository
{
  constructor(private prisma: PrismaClient) {}

  /**
   * SYUUSHI07_07 KUBUN1: 個人からの寄附のトランザクションを取得
   * TODO: 寄附者テーブル作成後に寄附者情報を実際のデータに置き換える
   */
  async findPersonalDonationTransactions(
    filters: TransactionFilters,
  ): Promise<PersonalDonationTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: CATEGORY_KEYS.INDIVIDUAL_DONATION,
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
        transactionDate: true,
        debitAmount: true,
        creditAmount: true,
        memo: true,
      },
    });

    return transactions.map((t) => ({
      transactionNo: t.transactionNo,
      transactionDate: t.transactionDate,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
      memo: t.memo,
      // TODO: 寄附者テーブル作成後に実際の値を取得する
      donorName: "（仮）寄附者氏名",
      donorAddress: "（仮）東京都千代田区永田町1-1-1",
      donorOccupation: "（仮）会社員",
    }));
  }

  /**
   * SYUUSHI07_03: 事業による収入のトランザクションを取得
   */
  async findBusinessIncomeTransactions(
    filters: TransactionFilters,
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
    filters: TransactionFilters,
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
    filters: TransactionFilters,
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
    filters: TransactionFilters,
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

  /**
   * SYUUSHI07_14 KUBUN1: 光熱水費のトランザクションを取得
   */
  async findUtilityExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<UtilityExpenseTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "expense",
        categoryKey: CATEGORY_KEYS.UTILITIES,
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
   * SYUUSHI07_14 KUBUN2: 備品・消耗品費のトランザクションを取得
   */
  async findSuppliesExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<SuppliesExpenseTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "expense",
        categoryKey: CATEGORY_KEYS.EQUIPMENT_SUPPLIES,
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
   * SYUUSHI07_14 KUBUN3: 事務所費のトランザクションを取得
   */
  async findOfficeExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OfficeExpenseTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "expense",
        categoryKey: CATEGORY_KEYS.OFFICE_EXPENSES,
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
}
