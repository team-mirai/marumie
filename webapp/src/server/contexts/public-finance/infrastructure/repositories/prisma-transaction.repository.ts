import "server-only";
import type { Prisma, PrismaClient, Transaction as PrismaTransaction } from "@prisma/client";
import type { Transaction, TransactionType } from "@/shared/models/transaction";
import type { TransactionFilters } from "@/types/transaction-filters";
import type { DisplayTransactionType } from "@/server/contexts/public-finance/domain/models/display-transaction";
import type {
  ITransactionRepository,
  PaginatedResult,
  PaginationOptions,
  SankeyCategoryAggregationResult,
} from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { ITransactionListRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-list-repository.interface";
import { buildNetCategoryAggregation } from "@/server/contexts/public-finance/domain/services/net-category-aggregator";

export class PrismaTransactionRepository
  implements ITransactionRepository, ITransactionListRepository
{
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: BigInt(id) },
    });

    return transaction ? this.mapToTransaction(transaction) : null;
  }

  async findAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const where = this.buildWhereClause(filters);

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { transactionNo: "desc" }],
    });

    return transactions.map(this.mapToTransaction);
  }

  async findWithPagination(
    filters?: TransactionFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Transaction>> {
    const where = this.buildWhereClause(filters);

    const page = pagination?.page || 1;
    const perPage = pagination?.perPage || 50;
    const skip = (page - 1) * perPage;

    // Build orderBy based on sortBy and order parameters
    const orderBy = this.buildOrderByClause(pagination?.sortBy, pagination?.order);

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      items: transactions.map(this.mapToTransaction),
      total,
      page,
      perPage,
      totalPages,
    };
  }

  async getCategoryAggregationForSankey(
    politicalOrganizationIds: string[],
    financialYear: number,
    categoryType?: "political-category" | "friendly-category",
  ): Promise<SankeyCategoryAggregationResult> {
    if (categoryType === "friendly-category") {
      return this.getCategoryAggregationWithTag(politicalOrganizationIds, financialYear);
    }

    // デフォルト: politicalカテゴリーの場合は、accountからcategory/subcategoryにマッピングして集計
    const baseWhere = this.buildSankeyBaseWhere(politicalOrganizationIds, financialYear);

    // 返金（収入科目が借方／支出科目が貸方に来る仕訳）を正味として集計するため、
    // transactionType ではなく勘定科目の借方・貸方の合計から収支を判定する
    const [creditAggregation, debitAggregation] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ["creditAccount"],
        where: baseWhere,
        _sum: { creditAmount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ["debitAccount"],
        where: baseWhere,
        _sum: { debitAmount: true },
      }),
    ]);

    return buildNetCategoryAggregation(
      creditAggregation.map((item) => ({
        account: item.creditAccount || "",
        amount: Number(item._sum.creditAmount || 0),
      })),
      debitAggregation.map((item) => ({
        account: item.debitAccount || "",
        amount: Number(item._sum.debitAmount || 0),
      })),
    );
  }

  async getCategoryAggregationWithTag(
    politicalOrganizationIds: string[],
    financialYear: number,
  ): Promise<SankeyCategoryAggregationResult> {
    const baseWhere = this.buildSankeyBaseWhere(politicalOrganizationIds, financialYear);

    // friendlyカテゴリーの場合は、mainCategory + tagでグループ化
    const [creditAggregation, debitAggregation] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ["creditAccount", "friendlyCategory"],
        where: baseWhere,
        _sum: { creditAmount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ["debitAccount", "friendlyCategory"],
        where: baseWhere,
        _sum: { debitAmount: true },
      }),
    ]);

    return buildNetCategoryAggregation(
      creditAggregation.map((item) => ({
        account: item.creditAccount || "",
        tag: item.friendlyCategory || "",
        amount: Number(item._sum.creditAmount || 0),
      })),
      debitAggregation.map((item) => ({
        account: item.debitAccount || "",
        tag: item.friendlyCategory || "",
        amount: Number(item._sum.debitAmount || 0),
      })),
      { useTagAsSubcategory: true },
    );
  }

  private buildSankeyBaseWhere(
    politicalOrganizationIds: string[],
    financialYear: number,
  ): Prisma.TransactionWhereInput {
    return {
      politicalOrganizationId: {
        in: politicalOrganizationIds.map((id) => BigInt(id)),
      },
      financialYear,
      // 相殺項目（offset_income / offset_expense）は収支として表示しない
      transactionType: { in: ["income", "expense"] as DisplayTransactionType[] },
    };
  }

  async getTotalAmount(filters?: TransactionFilters): Promise<number> {
    const where = this.buildWhereClause(filters);

    const result = await this.prisma.transaction.groupBy({
      by: ["transactionType"],
      where,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    let total = 0;
    for (const row of result) {
      if (row.transactionType === "expense") {
        total -= Number(row._sum.debitAmount ?? 0);
      } else if (row.transactionType === "income") {
        total += Number(row._sum.creditAmount ?? 0);
      }
    }
    return total;
  }

  async getLastUpdatedAt(): Promise<Date | null> {
    const result = await this.prisma.transaction.aggregate({
      _max: {
        updatedAt: true,
      },
    });

    const updatedAt = result._max.updatedAt;
    return updatedAt ? new Date(updatedAt) : null;
  }

  async findAllWithPoliticalOrganizationName(
    filters?: TransactionFilters,
  ): Promise<Array<Transaction & { political_organization_name: string }>> {
    const where = this.buildWhereClause(filters);

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: [{ transactionDate: "desc" }, { transactionNo: "desc" }],
      include: {
        politicalOrganization: {
          select: {
            displayName: true,
          },
        },
      },
    });

    return transactions.map((transaction) => ({
      ...this.mapToTransaction(transaction),
      political_organization_name: transaction.politicalOrganization.displayName,
    }));
  }

  private buildWhereClause(filters?: TransactionFilters): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    // webapp では常に offset 系のトランザクションを除外
    where.transactionType = {
      in: ["income", "expense"] as DisplayTransactionType[],
    };

    // フィルターで特定の transaction_type が指定されている場合は上書き
    if (filters?.transaction_type) {
      where.transactionType = filters.transaction_type;
    }

    if (filters?.debit_account) {
      where.debitAccount = {
        contains: filters.debit_account,
        mode: "insensitive",
      };
    }

    if (filters?.credit_account) {
      where.creditAccount = {
        contains: filters.credit_account,
        mode: "insensitive",
      };
    }

    if (filters?.political_organization_ids && filters.political_organization_ids.length > 0) {
      where.politicalOrganizationId = {
        in: filters.political_organization_ids.map((id) => BigInt(id)),
      };
    }

    if (filters?.financial_year) {
      where.financialYear = filters.financial_year;
    }

    if (filters?.date_from || filters?.date_to) {
      where.transactionDate = {};
      if (filters.date_from) {
        where.transactionDate.gte = filters.date_from;
      }
      if (filters.date_to) {
        where.transactionDate.lte = filters.date_to;
      }
    }

    // Filter by category keys
    if (filters?.category_keys && filters.category_keys.length > 0) {
      where.categoryKey = { in: filters.category_keys };
    }

    return where;
  }

  private buildOrderByClause(
    sortBy?: "date" | "amount",
    order?: "asc" | "desc",
  ): Prisma.TransactionOrderByWithRelationInput[] {
    const sortOrder = order || "desc";

    if (sortBy === "amount") {
      // In double-entry bookkeeping, debitAmount and creditAmount are usually equal
      // We'll sort by debitAmount since it represents the transaction value
      // Use transaction_no as tiebreaker
      return [{ debitAmount: sortOrder }, { transactionNo: sortOrder }];
    }

    // Default to sorting by date, with transaction_no as tiebreaker
    return [{ transactionDate: sortOrder }, { transactionNo: sortOrder }];
  }

  private mapToTransaction(prismaTransaction: PrismaTransaction): Transaction {
    return {
      id: prismaTransaction.id.toString(),
      political_organization_id: prismaTransaction.politicalOrganizationId.toString(),
      transaction_no: prismaTransaction.transactionNo || "",
      transaction_date: prismaTransaction.transactionDate,
      financial_year: prismaTransaction.financialYear,
      transaction_type: prismaTransaction.transactionType as TransactionType,
      debit_account: prismaTransaction.debitAccount,
      debit_sub_account: prismaTransaction.debitSubAccount ?? undefined,
      debit_department: prismaTransaction.debitDepartment ?? undefined,
      debit_partner: prismaTransaction.debitPartner ?? undefined,
      debit_tax_category: prismaTransaction.debitTaxCategory ?? undefined,
      debit_amount: Number(prismaTransaction.debitAmount),
      credit_account: prismaTransaction.creditAccount,
      credit_sub_account: prismaTransaction.creditSubAccount ?? undefined,
      credit_department: prismaTransaction.creditDepartment ?? undefined,
      credit_partner: prismaTransaction.creditPartner ?? undefined,
      credit_tax_category: prismaTransaction.creditTaxCategory ?? undefined,
      credit_amount: Number(prismaTransaction.creditAmount),
      description: prismaTransaction.description ?? undefined,
      friendly_category: prismaTransaction.friendlyCategory ?? "",
      memo: prismaTransaction.memo ?? undefined,
      category_key: prismaTransaction.categoryKey,
      label: prismaTransaction.label,
      hash: prismaTransaction.hash || "",
      created_at: prismaTransaction.createdAt,
      updated_at: prismaTransaction.updatedAt,
    };
  }
}
