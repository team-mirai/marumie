import "server-only";

import type { Prisma, DonorType as PrismaDonorType } from "@prisma/client";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type {
  TransactionWithDonor,
  TransactionWithDonorFilters,
  TransactionWithDonorResult,
  TransactionByDonorFilters,
} from "@/server/contexts/report/domain/models/transaction-with-donor";
import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import {
  DONOR_REQUIRED_CATEGORIES,
  isDonorRequired,
  getAllowedDonorTypes,
} from "@/server/contexts/report/domain/models/donor-assignment-rules";
import type { TransactionForDonorCsv } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type { PrismaClientOrTransaction } from "@/server/contexts/shared/infrastructure/prisma";

export class PrismaTransactionWithDonorRepository implements ITransactionWithDonorRepository {
  constructor(private prisma: PrismaClientOrTransaction) {}

  private mapDonorType(prismaDonorType: PrismaDonorType): DonorType {
    switch (prismaDonorType) {
      case "individual":
        return "individual";
      case "corporation":
        return "corporation";
      case "political_organization":
        return "political_organization";
    }
  }

  async findTransactionsWithDonors(
    filters: TransactionWithDonorFilters,
  ): Promise<TransactionWithDonorResult> {
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

    if (!/^\d+$/.test(politicalOrganizationId)) {
      throw new Error(
        `Invalid politicalOrganizationId: "${politicalOrganizationId}" is not a valid numeric string`,
      );
    }

    const donorTargetCondition: Prisma.TransactionWhereInput = {
      transactionType: "income",
      categoryKey: { in: [...DONOR_REQUIRED_CATEGORIES] },
    };

    const conditions: Prisma.TransactionWhereInput[] = [
      { politicalOrganizationId: BigInt(politicalOrganizationId) },
      { financialYear },
      donorTargetCondition,
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
        transactionDonors: { none: {} },
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
        transactionDonors: {
          select: {
            donor: {
              select: {
                id: true,
                donorType: true,
                name: true,
                address: true,
                occupation: true,
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
        donor:
          t.transactionDonors.length > 0
            ? {
                id: t.transactionDonors[0].donor.id.toString(),
                donorType: this.mapDonorType(t.transactionDonors[0].donor.donorType),
                name: t.transactionDonors[0].donor.name,
                address: t.transactionDonors[0].donor.address,
                occupation: t.transactionDonors[0].donor.occupation,
              }
            : null,
        requiresDonor: isDonorRequired(t.categoryKey),
        allowedDonorTypes: getAllowedDonorTypes(t.categoryKey),
      })),
      total,
    };
  }

  async findByDonor(filters: TransactionByDonorFilters): Promise<TransactionWithDonorResult> {
    const {
      donorId,
      politicalOrganizationId,
      financialYear,
      limit = 50,
      offset = 0,
      sortField = "transactionDate",
      sortOrder = "desc",
    } = filters;

    if (!/^\d+$/.test(donorId)) {
      throw new Error(`Invalid donorId: "${donorId}" is not a valid numeric string`);
    }

    const conditions: Prisma.TransactionWhereInput[] = [
      {
        transactionDonors: {
          some: {
            donorId: BigInt(donorId),
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
          transactionDonors: {
            select: {
              donor: {
                select: {
                  id: true,
                  donorType: true,
                  name: true,
                  address: true,
                  occupation: true,
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
        donor:
          t.transactionDonors.length > 0
            ? {
                id: t.transactionDonors[0].donor.id.toString(),
                donorType: this.mapDonorType(t.transactionDonors[0].donor.donorType),
                name: t.transactionDonors[0].donor.name,
                address: t.transactionDonors[0].donor.address,
                occupation: t.transactionDonors[0].donor.occupation,
              }
            : null,
        requiresDonor: isDonorRequired(t.categoryKey),
        allowedDonorTypes: getAllowedDonorTypes(t.categoryKey),
      })),
      total,
    };
  }

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

  async findByIdWithDonor(id: bigint): Promise<TransactionWithDonor | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        transactionDonors: {
          include: {
            donor: true,
          },
        },
      },
    });

    if (!transaction) {
      return null;
    }

    const firstDonor = transaction.transactionDonors[0];
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
      donor: firstDonor
        ? {
            id: firstDonor.donor.id.toString(),
            donorType: this.mapDonorType(firstDonor.donor.donorType),
            name: firstDonor.donor.name,
            address: firstDonor.donor.address,
            occupation: firstDonor.donor.occupation,
          }
        : null,
      requiresDonor: isDonorRequired(transaction.categoryKey),
      allowedDonorTypes: getAllowedDonorTypes(transaction.categoryKey),
    };
  }

  async findByIdsWithDonor(ids: bigint[]): Promise<TransactionWithDonor[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { id: { in: ids } },
      include: {
        transactionDonors: {
          include: {
            donor: true,
          },
        },
      },
    });

    return transactions.map((transaction) => {
      const firstDonor = transaction.transactionDonors[0];
      const rawTransactionType = transaction.transactionType;
      if (rawTransactionType !== "income" && rawTransactionType !== "expense") {
        throw new Error(
          `Unexpected transactionType: ${rawTransactionType} for transaction ${transaction.id}`,
        );
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
        donor: firstDonor
          ? {
              id: firstDonor.donor.id.toString(),
              donorType: this.mapDonorType(firstDonor.donor.donorType),
              name: firstDonor.donor.name,
              address: firstDonor.donor.address,
              occupation: firstDonor.donor.occupation,
            }
          : null,
        requiresDonor: isDonorRequired(transaction.categoryKey),
        allowedDonorTypes: getAllowedDonorTypes(transaction.categoryKey),
      };
    });
  }

  async findByTransactionNosForDonorCsv(
    transactionNos: string[],
    politicalOrganizationId: string,
  ): Promise<TransactionForDonorCsv[]> {
    if (transactionNos.length === 0) {
      return [];
    }

    if (!/^\d+$/.test(politicalOrganizationId)) {
      throw new Error(
        `Invalid politicalOrganizationId: "${politicalOrganizationId}" is not a valid numeric string`,
      );
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        transactionNo: { in: transactionNos },
        politicalOrganizationId: BigInt(politicalOrganizationId),
      },
      include: {
        transactionDonors: {
          include: {
            donor: true,
          },
        },
      },
      orderBy: {
        transactionNo: "asc",
      },
    });

    return transactions.map((t) => {
      const firstDonor = t.transactionDonors[0];
      return {
        id: t.id.toString(),
        transactionNo: t.transactionNo,
        transactionDate: t.transactionDate,
        categoryKey: t.categoryKey,
        friendlyCategory: t.friendlyCategory,
        debitAmount: Number(t.debitAmount),
        creditAmount: Number(t.creditAmount),
        debitPartner: t.debitPartner,
        creditPartner: t.creditPartner,
        existingDonor: firstDonor
          ? {
              id: firstDonor.donor.id.toString(),
              name: firstDonor.donor.name,
              donorType: this.mapDonorType(firstDonor.donor.donorType),
            }
          : null,
      };
    });
  }
}
