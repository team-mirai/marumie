import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  BalanceSnapshot,
  CreateBalanceSnapshotInput,
  BalanceSnapshotFilters,
} from "@/shared/models/balance-snapshot";
import type { IBalanceSnapshotRepository } from "@/server/contexts/shared/domain/repositories/balance-snapshot-repository.interface";

export class PrismaBalanceSnapshotRepository
  implements IBalanceSnapshotRepository
{
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateBalanceSnapshotInput): Promise<BalanceSnapshot> {
    const balanceSnapshot = await this.prisma.balanceSnapshot.create({
      data: {
        politicalOrganizationId: BigInt(input.political_organization_id),
        snapshotDate: input.snapshot_date,
        balance: input.balance,
      },
    });

    return this.mapToBalanceSnapshot(balanceSnapshot);
  }

  async findAll(filters?: BalanceSnapshotFilters): Promise<BalanceSnapshot[]> {
    const where = this.buildWhereClause(filters);

    const balanceSnapshots = await this.prisma.balanceSnapshot.findMany({
      where,
      orderBy: [{ snapshotDate: "desc" }, { createdAt: "desc" }],
    });

    return balanceSnapshots.map((bs) => this.mapToBalanceSnapshot(bs));
  }

  private buildWhereClause(
    filters?: BalanceSnapshotFilters,
  ): Prisma.BalanceSnapshotWhereInput {
    const where: Prisma.BalanceSnapshotWhereInput = {};

    if (filters?.political_organization_id) {
      where.politicalOrganizationId = BigInt(filters.political_organization_id);
    }

    return where;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.balanceSnapshot.delete({
      where: { id: BigInt(id) },
    });
  }

  private mapToBalanceSnapshot(
    prismaBalanceSnapshot: Prisma.BalanceSnapshotGetPayload<object>,
  ): BalanceSnapshot {
    return {
      id: prismaBalanceSnapshot.id.toString(),
      political_organization_id:
        prismaBalanceSnapshot.politicalOrganizationId.toString(),
      snapshot_date: prismaBalanceSnapshot.snapshotDate,
      balance: Number(prismaBalanceSnapshot.balance),
      created_at: prismaBalanceSnapshot.createdAt,
      updated_at: prismaBalanceSnapshot.updatedAt,
    };
  }
}
