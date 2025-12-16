import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AdvertisingExpenseTransaction,
  BusinessIncomeTransaction,
  DonationGrantExpenseTransaction,
  ElectionExpenseTransaction,
  FundraisingPartyExpenseTransaction,
  GrantIncomeTransaction,
  IReportTransactionRepository,
  LoanIncomeTransaction,
  OfficeExpenseTransaction,
  OrganizationExpenseTransaction,
  OtherBusinessExpenseTransaction,
  OtherIncomeTransaction,
  OtherPoliticalExpenseTransaction,
  PersonalDonationTransaction,
  PublicationExpenseTransaction,
  ResearchExpenseTransaction,
  SuppliesExpenseTransaction,
  TransactionFilters,
  TransactionWithCounterpartFilters,
  TransactionWithCounterpartResult,
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
  // SYUUSHI07_15用
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  ORGANIZATIONAL_ACTIVITIES: PL_CATEGORIES["組織活動費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  ELECTION_EXPENSES: PL_CATEGORIES["選挙関係費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PUBLICATION_EXPENSES: PL_CATEGORIES["機関紙誌の発行事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  ADVERTISING_EXPENSES: PL_CATEGORIES["宣伝事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  FUNDRAISING_PARTY_EXPENSES: PL_CATEGORIES["政治資金パーティー開催事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  OTHER_BUSINESS_EXPENSES: PL_CATEGORIES["その他の事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  RESEARCH_EXPENSES: PL_CATEGORIES["調査研究費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  DONATIONS_GRANTS_EXPENSES: PL_CATEGORIES["寄附・交付金"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  POLITICAL_ACTIVITY_OTHER_EXPENSES: PL_CATEGORIES["その他の経費"].key,
} as const;

/**
 * 政治活動費トランザクションの共通フィールド型
 */
interface PoliticalActivityExpenseTransactionRaw {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

export class PrismaReportTransactionRepository implements IReportTransactionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * 政治活動費トランザクション取得の共通ヘルパーメソッド
   * TODO: CounterPartテーブル実装後に実際の値を取得する
   */
  private async findPoliticalActivityExpenseTransactions(
    filters: TransactionFilters,
    categoryKey: string,
  ): Promise<PoliticalActivityExpenseTransactionRaw[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "expense",
        categoryKey,
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
  async findLoanIncomeTransactions(filters: TransactionFilters): Promise<LoanIncomeTransaction[]> {
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

  /**
   * SYUUSHI07_15 KUBUN1: 組織活動費のトランザクションを取得
   */
  async findOrganizationExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OrganizationExpenseTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "expense",
        categoryKey: CATEGORY_KEYS.ORGANIZATIONAL_ACTIVITIES,
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
   * SYUUSHI07_15 KUBUN2: 選挙関係費のトランザクションを取得
   */
  async findElectionExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<ElectionExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(filters, CATEGORY_KEYS.ELECTION_EXPENSES);
  }

  /**
   * SYUUSHI07_15 KUBUN3: 機関紙誌の発行事業費のトランザクションを取得
   */
  async findPublicationExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<PublicationExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.PUBLICATION_EXPENSES,
    );
  }

  /**
   * SYUUSHI07_15 KUBUN4: 宣伝事業費のトランザクションを取得
   */
  async findAdvertisingExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<AdvertisingExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.ADVERTISING_EXPENSES,
    );
  }

  /**
   * SYUUSHI07_15 KUBUN5: 政治資金パーティー開催事業費のトランザクションを取得
   */
  async findFundraisingPartyExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<FundraisingPartyExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.FUNDRAISING_PARTY_EXPENSES,
    );
  }

  /**
   * SYUUSHI07_15 KUBUN6: その他の事業費のトランザクションを取得
   */
  async findOtherBusinessExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OtherBusinessExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.OTHER_BUSINESS_EXPENSES,
    );
  }

  /**
   * SYUUSHI07_15 KUBUN7: 調査研究費のトランザクションを取得
   */
  async findResearchExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<ResearchExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(filters, CATEGORY_KEYS.RESEARCH_EXPENSES);
  }

  /**
   * SYUUSHI07_15 KUBUN8: 寄附・交付金のトランザクションを取得
   */
  async findDonationGrantExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<DonationGrantExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.DONATIONS_GRANTS_EXPENSES,
    );
  }

  /**
   * SYUUSHI07_15 KUBUN9: その他の経費のトランザクションを取得
   */
  async findOtherPoliticalExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<OtherPoliticalExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.POLITICAL_ACTIVITY_OTHER_EXPENSES,
    );
  }

  /**
   * Counterpart紐付け管理用: TransactionとCounterpartの紐付け情報を含むTransaction一覧を取得
   */
  async findTransactionsWithCounterparts(
    filters: TransactionWithCounterpartFilters,
  ): Promise<TransactionWithCounterpartResult> {
    const {
      politicalOrganizationId,
      financialYear,
      unassignedOnly,
      categoryKey,
      searchQuery,
      limit = 50,
      offset = 0,
      sortField = "transactionDate",
      sortOrder = "asc",
    } = filters;

    const whereClause: Prisma.TransactionWhereInput = {
      politicalOrganizationId: BigInt(politicalOrganizationId),
      financialYear,
    };

    if (categoryKey) {
      whereClause.categoryKey = categoryKey;
    }

    if (searchQuery) {
      const searchTerm = searchQuery.trim();
      if (searchTerm) {
        whereClause.OR = [
          { description: { contains: searchTerm, mode: "insensitive" } },
          { memo: { contains: searchTerm, mode: "insensitive" } },
          { friendlyCategory: { contains: searchTerm, mode: "insensitive" } },
          { debitPartner: { contains: searchTerm, mode: "insensitive" } },
          { creditPartner: { contains: searchTerm, mode: "insensitive" } },
        ];
      }
    }

    if (unassignedOnly) {
      whereClause.transactionCounterparts = {
        none: {},
      };
    }

    const orderByField =
      sortField === "debitAmount"
        ? "debitAmount"
        : sortField === "categoryKey"
          ? "categoryKey"
          : "transactionDate";

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: [{ [orderByField]: sortOrder }, { id: "asc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        transactionNo: true,
        transactionDate: true,
        financialYear: true,
        transactionType: true,
        categoryKey: true,
        friendlyCategory: true,
        label: true,
        description: true,
        memo: true,
        debitAmount: true,
        creditAmount: true,
        debitPartner: true,
        creditPartner: true,
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    const total = await this.prisma.transaction.count({
      where: whereClause,
    });

    return {
      transactions: transactions.map((t) => ({
        id: t.id.toString(),
        transactionNo: t.transactionNo,
        transactionDate: t.transactionDate,
        financialYear: t.financialYear,
        transactionType: t.transactionType as "income" | "expense",
        categoryKey: t.categoryKey,
        friendlyCategory: t.friendlyCategory,
        label: t.label,
        description: t.description,
        memo: t.memo,
        debitAmount: Number(t.debitAmount),
        creditAmount: Number(t.creditAmount),
        debitPartner: t.debitPartner,
        creditPartner: t.creditPartner,
        counterpart:
          t.transactionCounterparts.length > 0
            ? {
                id: t.transactionCounterparts[0].counterpart.id.toString(),
                name: t.transactionCounterparts[0].counterpart.name,
                address: t.transactionCounterparts[0].counterpart.address,
              }
            : null,
      })),
      total,
    };
  }
}
