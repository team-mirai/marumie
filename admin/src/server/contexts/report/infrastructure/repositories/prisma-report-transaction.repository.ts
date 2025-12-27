import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AdvertisingExpenseTransaction,
  BranchGrantExpenseTransaction,
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
  PersonnelExpenseTransaction,
  PublicationExpenseTransaction,
  ResearchExpenseTransaction,
  SuppliesExpenseTransaction,
  TransactionFilters,
  TransactionWithCounterpartFilters,
  TransactionWithCounterpartResult,
  TransactionByCounterpartFilters,
  UtilityExpenseTransaction,
} from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import {
  COUNTERPART_REQUIRED_INCOME_CATEGORIES,
  COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
  ROUTINE_EXPENSE_CATEGORIES,
  ROUTINE_EXPENSE_THRESHOLD,
  POLITICAL_ACTIVITY_EXPENSE_THRESHOLD,
  requiresCounterpartDetail,
} from "@/server/contexts/report/domain/models/counterpart-assignment-rules";
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
  // SYUUSHI07_13: 人件費
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PERSONNEL_COSTS: PL_CATEGORIES["人件費"].key,
  // SYUUSHI07_16: 本部又は支部に対する交付金
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  BRANCH_GRANTS_EXPENSES: PL_CATEGORIES["本部又は支部に対する交付金"].key,
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
        transactionCounterparts: {
          select: {
            counterpart: {
              select: {
                name: true,
                address: true,
              },
            },
          },
        },
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
      counterpartName: t.transactionCounterparts[0]?.counterpart.name ?? "",
      counterpartAddress: t.transactionCounterparts[0]?.counterpart.address ?? "",
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
   * SYUUSHI07_13: 人件費のトランザクションを取得
   * 人件費はシート14に明細を出力しないが、シート13の総括表には合計額が必要
   */
  async findPersonnelExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<PersonnelExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(filters, CATEGORY_KEYS.PERSONNEL_COSTS);
  }

  /**
   * SYUUSHI07_16: 本部又は支部に対する交付金のトランザクションを取得
   */
  async findBranchGrantExpenseTransactions(
    filters: TransactionFilters,
  ): Promise<BranchGrantExpenseTransaction[]> {
    return this.findPoliticalActivityExpenseTransactions(
      filters,
      CATEGORY_KEYS.BRANCH_GRANTS_EXPENSES,
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
      requiresCounterpartOnly = false,
      categoryKey,
      searchQuery,
      limit = 50,
      offset = 0,
      sortField = "transactionDate",
      sortOrder = "asc",
    } = filters;

    if (!/^\d+$/.test(politicalOrganizationId)) {
      throw new Error(
        `Invalid politicalOrganizationId: "${politicalOrganizationId}" is not a valid numeric string`,
      );
    }

    // ドメインルールを使用してCounterpart紐付け対象を定義
    // - 支出先: 経常経費・政治活動費のカテゴリ
    // - 借入先: loan income transaction
    // - 本部・支部: grant income transaction
    // ※ 寄附者（個人からの寄附）は別テーブル（Donor）で管理するため対象外
    const counterpartTargetCondition: Prisma.TransactionWhereInput = {
      OR: [
        {
          transactionType: "expense",
          categoryKey: { in: [...COUNTERPART_REQUIRED_EXPENSE_CATEGORIES] },
        },
        {
          transactionType: "income",
          categoryKey: { in: [...COUNTERPART_REQUIRED_INCOME_CATEGORIES] },
        },
      ],
    };

    const conditions: Prisma.TransactionWhereInput[] = [
      { politicalOrganizationId: BigInt(politicalOrganizationId) },
      { financialYear },
      counterpartTargetCondition,
    ];

    if (categoryKey) {
      conditions.push({ categoryKey });
    }

    if (searchQuery) {
      const searchTerm = searchQuery.trim();
      if (searchTerm) {
        conditions.push({
          OR: [
            { description: { contains: searchTerm, mode: "insensitive" } },
            { memo: { contains: searchTerm, mode: "insensitive" } },
            { friendlyCategory: { contains: searchTerm, mode: "insensitive" } },
            { debitPartner: { contains: searchTerm, mode: "insensitive" } },
            { creditPartner: { contains: searchTerm, mode: "insensitive" } },
          ],
        });
      }
    }

    if (unassignedOnly) {
      conditions.push({
        transactionCounterparts: { none: {} },
      });
    }

    if (requiresCounterpartOnly) {
      // 経常経費は10万円以上、政治活動費は5万円以上、収入は閾値なし（すべて記載）
      conditions.push({
        OR: [
          // 経常経費: 10万円以上
          {
            categoryKey: { in: [...ROUTINE_EXPENSE_CATEGORIES] },
            debitAmount: { gte: ROUTINE_EXPENSE_THRESHOLD },
          },
          // 政治活動費: 5万円以上（経常経費以外の支出カテゴリ）
          {
            categoryKey: {
              in: COUNTERPART_REQUIRED_EXPENSE_CATEGORIES.filter(
                (key) =>
                  !ROUTINE_EXPENSE_CATEGORIES.includes(
                    key as (typeof ROUTINE_EXPENSE_CATEGORIES)[number],
                  ),
              ),
            },
            debitAmount: { gte: POLITICAL_ACTIVITY_EXPENSE_THRESHOLD },
          },
          // 収入（借入金・交付金）: 閾値なし
          {
            transactionType: "income",
            categoryKey: { in: [...COUNTERPART_REQUIRED_INCOME_CATEGORIES] },
          },
        ],
      });
    }

    const whereClause: Prisma.TransactionWhereInput = { AND: conditions };

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
        requiresCounterpart: requiresCounterpartDetail(
          t.transactionType as "income" | "expense",
          t.categoryKey,
          Number(t.debitAmount),
        ),
      })),
      total,
    };
  }

  /**
   * 特定のカウンターパートに紐づいている取引を取得
   */
  async findByCounterpart(
    filters: TransactionByCounterpartFilters,
  ): Promise<TransactionWithCounterpartResult> {
    const {
      counterpartId,
      politicalOrganizationId,
      financialYear,
      limit = 50,
      offset = 0,
      sortField = "transactionDate",
      sortOrder = "desc",
    } = filters;

    if (!/^\d+$/.test(counterpartId)) {
      throw new Error(`Invalid counterpartId: "${counterpartId}" is not a valid numeric string`);
    }

    const conditions: Prisma.TransactionWhereInput[] = [
      {
        transactionCounterparts: {
          some: {
            counterpartId: BigInt(counterpartId),
          },
        },
      },
    ];

    if (politicalOrganizationId) {
      if (!/^\d+$/.test(politicalOrganizationId)) {
        throw new Error(
          `Invalid politicalOrganizationId: "${politicalOrganizationId}" is not a valid numeric string`,
        );
      }
      conditions.push({ politicalOrganizationId: BigInt(politicalOrganizationId) });
    }

    if (financialYear) {
      conditions.push({ financialYear });
    }

    const whereClause: Prisma.TransactionWhereInput = { AND: conditions };

    const orderByField =
      sortField === "debitAmount"
        ? "debitAmount"
        : sortField === "categoryKey"
          ? "categoryKey"
          : "transactionDate";

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
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
      }),
      this.prisma.transaction.count({ where: whereClause }),
    ]);

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
        requiresCounterpart: requiresCounterpartDetail(
          t.transactionType as "income" | "expense",
          t.categoryKey,
          Number(t.debitAmount),
        ),
      })),
      total,
    };
  }

  /**
   * トランザクションIDで存在確認
   */
  async existsById(id: bigint): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      select: { id: true },
    });
    return transaction !== null;
  }

  /**
   * 複数のトランザクションIDで存在するIDのリストを取得
   */
  async findExistingIds(ids: bigint[]): Promise<bigint[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return transactions.map((t) => t.id);
  }

  /**
   * トランザクションIDでCounterpart情報付きのトランザクションを取得
   */
  async findByIdWithCounterpart(
    id: bigint,
  ): Promise<
    | import("@/server/contexts/report/domain/models/transaction-with-counterpart").TransactionWithCounterpart
    | null
  > {
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
    const rawTransactionType = transaction.transactionType;
    if (rawTransactionType !== "income" && rawTransactionType !== "expense") {
      throw new Error(`Unexpected transactionType: ${rawTransactionType} for transaction ${id}`);
    }
    const transactionType = rawTransactionType;

    return {
      id: transaction.id.toString(),
      transactionNo: transaction.transactionNo,
      transactionDate: transaction.transactionDate,
      financialYear: transaction.financialYear,
      transactionType,
      categoryKey: transaction.categoryKey,
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
        transaction.categoryKey,
        Number(transaction.debitAmount),
      ),
    };
  }
}
