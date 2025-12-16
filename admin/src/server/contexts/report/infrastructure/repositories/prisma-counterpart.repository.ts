import "server-only";

import type { PrismaClient, Counterpart as PrismaCounterpart } from "@prisma/client";
import type {
  Counterpart,
  CounterpartWithUsage,
  CreateCounterpartInput,
  UpdateCounterpartInput,
} from "@/server/contexts/report/domain/models/counterpart";
import type {
  CounterpartFilters,
  CounterpartWithUsageAndLastUsed,
  ICounterpartRepository,
} from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

export class PrismaCounterpartRepository implements ICounterpartRepository {
  constructor(private prisma: PrismaClient) {}

  private mapToCounterpart(prismaCounterpart: PrismaCounterpart): Counterpart {
    return {
      id: prismaCounterpart.id.toString(),
      name: prismaCounterpart.name,
      address: prismaCounterpart.address,
      createdAt: prismaCounterpart.createdAt,
      updatedAt: prismaCounterpart.updatedAt,
    };
  }

  private parseBigIntId(id: string): bigint | null {
    if (!/^\d+$/.test(id)) {
      return null;
    }
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async findById(id: string): Promise<Counterpart | null> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      return null;
    }

    const counterpart = await this.prisma.counterpart.findUnique({
      where: { id: bigIntId },
    });

    if (!counterpart) {
      return null;
    }

    return this.mapToCounterpart(counterpart);
  }

  async findByNameAndAddress(name: string, address: string): Promise<Counterpart | null> {
    const counterpart = await this.prisma.counterpart.findUnique({
      where: {
        name_address: {
          name,
          address,
        },
      },
    });

    if (!counterpart) {
      return null;
    }

    return this.mapToCounterpart(counterpart);
  }

  async findAll(filters?: CounterpartFilters): Promise<Counterpart[]> {
    const where = this.buildWhereClause(filters);

    const counterparts = await this.prisma.counterpart.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: filters?.limit,
      skip: filters?.offset,
    });

    return counterparts.map((c) => this.mapToCounterpart(c));
  }

  async findAllWithUsage(filters?: CounterpartFilters): Promise<CounterpartWithUsage[]> {
    const where = this.buildWhereClause(filters);

    const counterparts = await this.prisma.counterpart.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: filters?.limit,
      skip: filters?.offset,
      include: {
        _count: {
          select: {
            transactionCounterparts: true,
          },
        },
      },
    });

    return counterparts.map((c) => ({
      ...this.mapToCounterpart(c),
      usageCount: c._count.transactionCounterparts,
    }));
  }

  async create(data: CreateCounterpartInput): Promise<Counterpart> {
    const counterpart = await this.prisma.counterpart.create({
      data: {
        name: data.name.trim(),
        address: data.address.trim(),
      },
    });

    return this.mapToCounterpart(counterpart);
  }

  async update(id: string, data: UpdateCounterpartInput): Promise<Counterpart> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      throw new Error(`無効なID形式です: ${id}`);
    }

    const updateData: { name?: string; address?: string } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.address !== undefined) {
      updateData.address = data.address.trim();
    }

    const counterpart = await this.prisma.counterpart.update({
      where: { id: bigIntId },
      data: updateData,
    });

    return this.mapToCounterpart(counterpart);
  }

  async delete(id: string): Promise<void> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      throw new Error(`無効なID形式です: ${id}`);
    }

    await this.prisma.counterpart.delete({
      where: { id: bigIntId },
    });
  }

  async getUsageCount(id: string): Promise<number> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      return 0;
    }

    const count = await this.prisma.transactionCounterpart.count({
      where: { counterpartId: bigIntId },
    });

    return count;
  }

  async count(filters?: CounterpartFilters): Promise<number> {
    const where = this.buildWhereClause(filters);

    return this.prisma.counterpart.count({ where });
  }

  private buildWhereClause(filters?: CounterpartFilters) {
    if (!filters?.searchQuery) {
      return {};
    }

    const searchQuery = filters.searchQuery.trim();
    if (!searchQuery) {
      return {};
    }

    return {
      OR: [
        { name: { contains: searchQuery, mode: "insensitive" as const } },
        { address: { contains: searchQuery, mode: "insensitive" as const } },
      ],
    };
  }

  async findByUsageFrequency(
    politicalOrganizationId: string,
    limit: number,
  ): Promise<CounterpartWithUsageAndLastUsed[]> {
    const orgBigIntId = this.parseBigIntId(politicalOrganizationId);
    if (orgBigIntId === null) {
      return [];
    }

    const counterpartsWithUsage = await this.prisma.counterpart.findMany({
      where: {
        transactionCounterparts: {
          some: {
            transaction: {
              politicalOrganizationId: orgBigIntId,
            },
          },
        },
      },
      include: {
        transactionCounterparts: {
          where: {
            transaction: {
              politicalOrganizationId: orgBigIntId,
            },
          },
          include: {
            transaction: {
              select: {
                transactionDate: true,
              },
            },
          },
          orderBy: {
            transaction: {
              transactionDate: "desc",
            },
          },
        },
        _count: {
          select: {
            transactionCounterparts: {
              where: {
                transaction: {
                  politicalOrganizationId: orgBigIntId,
                },
              },
            },
          },
        },
      },
    });

    const result: CounterpartWithUsageAndLastUsed[] = counterpartsWithUsage.map((c) => ({
      ...this.mapToCounterpart(c),
      usageCount: c._count.transactionCounterparts,
      lastUsedAt: c.transactionCounterparts[0]?.transaction.transactionDate ?? null,
    }));

    result.sort((a, b) => b.usageCount - a.usageCount);

    return result.slice(0, limit);
  }

  async findByPartnerName(
    politicalOrganizationId: string,
    partnerName: string,
  ): Promise<CounterpartWithUsageAndLastUsed[]> {
    const orgBigIntId = this.parseBigIntId(politicalOrganizationId);
    if (orgBigIntId === null) {
      return [];
    }

    const trimmedPartnerName = partnerName.trim();
    if (!trimmedPartnerName) {
      return [];
    }

    const counterpartsWithUsage = await this.prisma.counterpart.findMany({
      where: {
        transactionCounterparts: {
          some: {
            transaction: {
              politicalOrganizationId: orgBigIntId,
              OR: [
                { debitPartner: { contains: trimmedPartnerName, mode: "insensitive" } },
                { creditPartner: { contains: trimmedPartnerName, mode: "insensitive" } },
              ],
            },
          },
        },
      },
      include: {
        transactionCounterparts: {
          where: {
            transaction: {
              politicalOrganizationId: orgBigIntId,
              OR: [
                { debitPartner: { contains: trimmedPartnerName, mode: "insensitive" } },
                { creditPartner: { contains: trimmedPartnerName, mode: "insensitive" } },
              ],
            },
          },
          include: {
            transaction: {
              select: {
                transactionDate: true,
              },
            },
          },
          orderBy: {
            transaction: {
              transactionDate: "desc",
            },
          },
        },
        _count: {
          select: {
            transactionCounterparts: {
              where: {
                transaction: {
                  politicalOrganizationId: orgBigIntId,
                  OR: [
                    { debitPartner: { contains: trimmedPartnerName, mode: "insensitive" } },
                    { creditPartner: { contains: trimmedPartnerName, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        },
      },
    });

    const result: CounterpartWithUsageAndLastUsed[] = counterpartsWithUsage.map((c) => ({
      ...this.mapToCounterpart(c),
      usageCount: c._count.transactionCounterparts,
      lastUsedAt: c.transactionCounterparts[0]?.transaction.transactionDate ?? null,
    }));

    result.sort((a, b) => b.usageCount - a.usageCount);

    return result;
  }
}
