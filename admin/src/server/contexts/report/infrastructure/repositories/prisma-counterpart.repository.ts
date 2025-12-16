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

  async findById(id: string): Promise<Counterpart | null> {
    const counterpart = await this.prisma.counterpart.findUnique({
      where: { id: BigInt(id) },
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
    const updateData: { name?: string; address?: string } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.address !== undefined) {
      updateData.address = data.address.trim();
    }

    const counterpart = await this.prisma.counterpart.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return this.mapToCounterpart(counterpart);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.counterpart.delete({
      where: { id: BigInt(id) },
    });
  }

  async getUsageCount(id: string): Promise<number> {
    const count = await this.prisma.transactionCounterpart.count({
      where: { counterpartId: BigInt(id) },
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
}
