import type { Prisma, PrismaClient } from "@prisma/client";
import type { Transaction } from "@/shared/models/transaction";
import type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/types/transaction";
import type { TransactionWithOrganization } from "@/server/usecases/get-transactions-usecase";
import type {
  ITransactionRepository,
  PaginatedResult,
  PaginationOptions,
} from "./interfaces/transaction-repository.interface";

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private prisma: PrismaClient) {}

  async findWithPagination(
    filters?: TransactionFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<TransactionWithOrganization>> {
    const where = this.buildWhereClause(filters);

    const page = pagination?.page || 1;
    const perPage = pagination?.perPage || 50;
    const skip = (page - 1) * perPage;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          politicalOrganization: true,
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take: perPage,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      items: transactions.map((t) => this.mapToTransaction(t, true)),
      total,
      page,
      perPage,
      totalPages,
    };
  }

  private buildWhereClause(
    filters?: TransactionFilters,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

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

    if (
      filters?.political_organization_ids &&
      filters.political_organization_ids.length > 0
    ) {
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

    return where;
  }

  private async update(
    id: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction> {
    const updated = await this.prisma.transaction.update({
      where: { id: BigInt(id) },
      data: {
        politicalOrganizationId: input.political_organization_id
          ? BigInt(input.political_organization_id)
          : undefined,
        transactionNo: input.transaction_no,
        transactionDate: input.transaction_date,
        financialYear: input.financial_year,
        transactionType: input.transaction_type,
        debitAccount: input.debit_account,
        debitSubAccount: input.debit_sub_account || null,
        debitDepartment: input.debit_department || null,
        debitPartner: input.debit_partner || null,
        debitTaxCategory: input.debit_tax_category || null,
        debitAmount: input.debit_amount,
        creditAccount: input.credit_account,
        creditSubAccount: input.credit_sub_account || null,
        creditDepartment: input.credit_department || null,
        creditPartner: input.credit_partner || null,
        creditTaxCategory: input.credit_tax_category || null,
        creditAmount: input.credit_amount,
        description: input.description || "",
        label: input.label || "",
        friendlyCategory: input.friendly_category || "",
        memo: input.memo || null,
        categoryKey: input.category_key,
        hash: input.hash,
        updatedAt: new Date(),
      },
    });

    return this.mapToTransaction(updated);
  }

  async updateMany(
    data: Array<{
      where: { politicalOrganizationId: bigint; transactionNo: string };
      update: UpdateTransactionInput;
    }>,
  ): Promise<Transaction[]> {
    if (data.length === 0) return [];

    // 既存レコードを一括取得してN+1クエリを回避
    const whereConditions = data.map((item) => ({
      politicalOrganizationId: item.where.politicalOrganizationId,
      transactionNo: item.where.transactionNo,
    }));

    const existingTransactions = await this.prisma.transaction.findMany({
      where: {
        OR: whereConditions.map((condition) => ({
          AND: [
            { politicalOrganizationId: condition.politicalOrganizationId },
            { transactionNo: condition.transactionNo },
          ],
        })),
      },
      select: {
        id: true,
        politicalOrganizationId: true,
        transactionNo: true,
      },
    });

    // 存在しないトランザクションをチェック
    const existingMap = new Map(
      existingTransactions.map((t) => [
        `${t.politicalOrganizationId}-${t.transactionNo}`,
        t.id,
      ]),
    );

    const updateOperations: Array<{
      where: { id: bigint };
      data: Prisma.TransactionUpdateInput;
    }> = [];

    for (const item of data) {
      const key = `${item.where.politicalOrganizationId}-${item.where.transactionNo}`;
      const existingId = existingMap.get(key);

      if (!existingId) {
        throw new Error(`Transaction not found: ${item.where.transactionNo}`);
      }

      updateOperations.push({
        where: { id: existingId },
        data: {
          transactionNo: item.update.transaction_no,
          transactionDate: item.update.transaction_date,
          financialYear: item.update.financial_year,
          transactionType: item.update.transaction_type,
          debitAccount: item.update.debit_account,
          debitSubAccount: item.update.debit_sub_account || null,
          debitDepartment: item.update.debit_department || null,
          debitPartner: item.update.debit_partner || null,
          debitTaxCategory: item.update.debit_tax_category || null,
          debitAmount: item.update.debit_amount,
          creditAccount: item.update.credit_account,
          creditSubAccount: item.update.credit_sub_account || null,
          creditDepartment: item.update.credit_department || null,
          creditPartner: item.update.credit_partner || null,
          creditTaxCategory: item.update.credit_tax_category || null,
          creditAmount: item.update.credit_amount,
          description: item.update.description || "",
          label: item.update.label || "",
          friendlyCategory: item.update.friendly_category || "",
          memo: item.update.memo || null,
          categoryKey: item.update.category_key,
          hash: item.update.hash,
          updatedAt: new Date(),
        },
      });
    }

    // トランザクション内でバッチ更新を実行
    const updatedTransactions = await this.prisma.$transaction(
      updateOperations.map((operation) =>
        this.prisma.transaction.update(operation),
      ),
    );

    return updatedTransactions.map((t) => this.mapToTransaction(t));
  }

  async deleteAll(filters?: TransactionFilters): Promise<number> {
    const where = this.buildWhereClause(filters);

    const result = await this.prisma.transaction.deleteMany({
      where,
    });

    return result.count;
  }

  async createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]> {
    const data = inputs.map((input, index) => {
      try {
        return {
          politicalOrganizationId: BigInt(input.political_organization_id),
          transactionNo: input.transaction_no,
          transactionDate: input.transaction_date,
          financialYear: input.financial_year,
          transactionType: input.transaction_type,
          debitAccount: input.debit_account,
          debitSubAccount: input.debit_sub_account || null,
          debitDepartment: input.debit_department || null,
          debitPartner: input.debit_partner || null,
          debitTaxCategory: input.debit_tax_category || null,
          debitAmount: input.debit_amount,
          creditAccount: input.credit_account,
          creditSubAccount: input.credit_sub_account || null,
          creditDepartment: input.credit_department || null,
          creditPartner: input.credit_partner || null,
          creditTaxCategory: input.credit_tax_category || null,
          creditAmount: input.credit_amount,
          description: input.description || null,
          label: input.label || "",
          friendlyCategory: input.friendly_category,
          memo: input.memo || null,
          categoryKey: input.category_key,
          hash: input.hash,
        };
      } catch (error) {
        throw new Error(
          `Failed to convert transaction ${index}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    await this.prisma.transaction.createMany({
      data,
    });

    const createdTransactions = await this.prisma.transaction.findMany({
      where: {
        transactionNo: {
          in: inputs
            .map((input) => input.transaction_no)
            .filter((no): no is string => Boolean(no)),
        },
      },
      orderBy: { createdAt: "desc" },
      take: inputs.length,
    });

    return createdTransactions.map((t) => this.mapToTransaction(t));
  }

  async findByTransactionNos(
    transactionNos: string[],
    politicalOrganizationIds?: string[],
  ): Promise<Transaction[]> {
    const where: Prisma.TransactionWhereInput = {
      transactionNo: {
        in: transactionNos,
      },
    };

    if (politicalOrganizationIds && politicalOrganizationIds.length > 0) {
      where.politicalOrganizationId = {
        in: politicalOrganizationIds.map((id) => BigInt(id)),
      };
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
    });

    return transactions.map((t) => this.mapToTransaction(t));
  }

  public mapToTransaction(
    prismaTransaction: Prisma.TransactionGetPayload<{
      include?: { politicalOrganization?: true };
    }> & {
      politicalOrganization?: { displayName: string } | null;
    },
    includeOrganization = false,
  ): Transaction | TransactionWithOrganization {
    const base: Transaction = {
      id: prismaTransaction.id.toString(),
      political_organization_id:
        prismaTransaction.politicalOrganizationId.toString(),
      transaction_no: prismaTransaction.transactionNo,
      transaction_date: prismaTransaction.transactionDate,
      financial_year: prismaTransaction.financialYear,
      transaction_type: prismaTransaction.transactionType,
      debit_account: prismaTransaction.debitAccount,
      debit_sub_account: prismaTransaction.debitSubAccount || undefined,
      debit_department: prismaTransaction.debitDepartment || undefined,
      debit_partner: prismaTransaction.debitPartner || undefined,
      debit_tax_category: prismaTransaction.debitTaxCategory || undefined,
      debit_amount: Number(prismaTransaction.debitAmount),
      credit_account: prismaTransaction.creditAccount,
      credit_sub_account: prismaTransaction.creditSubAccount || undefined,
      credit_department: prismaTransaction.creditDepartment || undefined,
      credit_partner: prismaTransaction.creditPartner || undefined,
      credit_tax_category: prismaTransaction.creditTaxCategory || undefined,
      credit_amount: Number(prismaTransaction.creditAmount),
      description: prismaTransaction.description || "",
      friendly_category: prismaTransaction.friendlyCategory || "",
      memo: prismaTransaction.memo || undefined,
      category_key: prismaTransaction.categoryKey || "",
      label: prismaTransaction.label,
      hash: prismaTransaction.hash || "",
      created_at: prismaTransaction.createdAt,
      updated_at: prismaTransaction.updatedAt,
    };

    if (includeOrganization) {
      return {
        ...base,
        political_organization_name:
          prismaTransaction.politicalOrganization?.displayName,
      } as TransactionWithOrganization;
    }

    return base;
  }
}
