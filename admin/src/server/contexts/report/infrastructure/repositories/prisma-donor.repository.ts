import "server-only";

import type {
  PrismaClient,
  Donor as PrismaDonor,
  DonorType as PrismaDonorType,
} from "@prisma/client";
import type {
  Donor,
  DonorWithUsage,
  DonorType,
  CreateDonorInput,
  UpdateDonorInput,
} from "@/server/contexts/report/domain/models/donor";
import type {
  DonorFilters,
  DonorWithUsageAndLastUsed,
  IDonorRepository,
} from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { PrismaTransactionClient } from "@/server/contexts/report/domain/repositories/transaction-manager.interface";

export class PrismaDonorRepository implements IDonorRepository {
  constructor(private prisma: PrismaClient) {}

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

  private mapToPrismaDonorType(donorType: DonorType): PrismaDonorType {
    switch (donorType) {
      case "individual":
        return "individual";
      case "corporation":
        return "corporation";
      case "political_organization":
        return "political_organization";
    }
  }

  private mapToDonor(prismaDonor: PrismaDonor): Donor {
    return {
      id: prismaDonor.id.toString(),
      donorType: this.mapDonorType(prismaDonor.donorType),
      name: prismaDonor.name,
      address: prismaDonor.address,
      occupation: prismaDonor.occupation,
      createdAt: prismaDonor.createdAt,
      updatedAt: prismaDonor.updatedAt,
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

  async findById(id: string): Promise<Donor | null> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      return null;
    }

    const donor = await this.prisma.donor.findUnique({
      where: { id: bigIntId },
    });

    if (!donor) {
      return null;
    }

    return this.mapToDonor(donor);
  }

  async findByNameAddressAndType(
    name: string,
    address: string | null,
    donorType: DonorType,
  ): Promise<Donor | null> {
    const donor = await this.prisma.donor.findFirst({
      where: {
        name,
        address,
        donorType: this.mapToPrismaDonorType(donorType),
      },
    });

    if (!donor) {
      return null;
    }

    return this.mapToDonor(donor);
  }

  async findAll(filters?: DonorFilters): Promise<Donor[]> {
    const where = this.buildWhereClause(filters);

    const donors = await this.prisma.donor.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: filters?.limit,
      skip: filters?.offset,
    });

    return donors.map((d) => this.mapToDonor(d));
  }

  async findAllWithUsage(filters?: DonorFilters): Promise<DonorWithUsage[]> {
    const where = this.buildWhereClause(filters);

    const donors = await this.prisma.donor.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: filters?.limit,
      skip: filters?.offset,
      include: {
        _count: {
          select: {
            transactionDonors: true,
          },
        },
      },
    });

    return donors.map((d) => ({
      ...this.mapToDonor(d),
      usageCount: d._count.transactionDonors,
    }));
  }

  async findByType(donorType: DonorType): Promise<Donor[]> {
    const donors = await this.prisma.donor.findMany({
      where: {
        donorType: this.mapToPrismaDonorType(donorType),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return donors.map((d) => this.mapToDonor(d));
  }

  async create(data: CreateDonorInput): Promise<Donor> {
    const donor = await this.prisma.donor.create({
      data: {
        donorType: this.mapToPrismaDonorType(data.donorType),
        name: data.name.trim(),
        address: data.address?.trim() || null,
        occupation: data.occupation?.trim() || null,
      },
    });

    return this.mapToDonor(donor);
  }

  async update(id: string, data: UpdateDonorInput): Promise<Donor> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      throw new Error(`無効なID形式です: ${id}`);
    }

    const updateData: {
      donorType?: PrismaDonorType;
      name?: string;
      address?: string | null;
      occupation?: string | null;
    } = {};

    if (data.donorType !== undefined) {
      updateData.donorType = this.mapToPrismaDonorType(data.donorType);
    }
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.address !== undefined) {
      updateData.address = data.address?.trim() || null;
    }
    if (data.occupation !== undefined) {
      updateData.occupation = data.occupation?.trim() || null;
    }

    const donor = await this.prisma.donor.update({
      where: { id: bigIntId },
      data: updateData,
    });

    return this.mapToDonor(donor);
  }

  async delete(id: string): Promise<void> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      throw new Error(`無効なID形式です: ${id}`);
    }

    await this.prisma.donor.delete({
      where: { id: bigIntId },
    });
  }

  async getUsageCount(id: string): Promise<number> {
    const bigIntId = this.parseBigIntId(id);
    if (bigIntId === null) {
      return 0;
    }

    const count = await this.prisma.transactionDonor.count({
      where: { donorId: bigIntId },
    });

    return count;
  }

  async count(filters?: DonorFilters): Promise<number> {
    const where = this.buildWhereClause(filters);

    return this.prisma.donor.count({ where });
  }

  async exists(name: string, address: string | null, donorType: DonorType): Promise<boolean> {
    const donor = await this.prisma.donor.findFirst({
      where: {
        name,
        address,
        donorType: this.mapToPrismaDonorType(donorType),
      },
    });

    return donor !== null;
  }

  private buildWhereClause(filters?: DonorFilters) {
    const conditions: Record<string, unknown>[] = [];

    if (filters?.donorType) {
      conditions.push({
        donorType: this.mapToPrismaDonorType(filters.donorType),
      });
    }

    if (filters?.searchQuery) {
      const searchQuery = filters.searchQuery.trim();
      if (searchQuery) {
        conditions.push({
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" as const } },
            { address: { contains: searchQuery, mode: "insensitive" as const } },
            { occupation: { contains: searchQuery, mode: "insensitive" as const } },
          ],
        });
      }
    }

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { AND: conditions };
  }

  async findByUsageFrequency(
    politicalOrganizationId: string,
    limit: number,
  ): Promise<DonorWithUsageAndLastUsed[]> {
    const orgBigIntId = this.parseBigIntId(politicalOrganizationId);
    if (orgBigIntId === null) {
      return [];
    }

    const donorsWithUsage = await this.prisma.donor.findMany({
      where: {
        transactionDonors: {
          some: {
            transaction: {
              politicalOrganizationId: orgBigIntId,
            },
          },
        },
      },
      include: {
        transactionDonors: {
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
            transactionDonors: {
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

    const result: DonorWithUsageAndLastUsed[] = donorsWithUsage.map((d) => ({
      ...this.mapToDonor(d),
      usageCount: d._count.transactionDonors,
      lastUsedAt: d.transactionDonors[0]?.transaction.transactionDate ?? null,
    }));

    result.sort((a, b) => b.usageCount - a.usageCount);

    return result.slice(0, limit);
  }

  async findByPartnerName(
    politicalOrganizationId: string,
    partnerName: string,
  ): Promise<DonorWithUsageAndLastUsed[]> {
    const orgBigIntId = this.parseBigIntId(politicalOrganizationId);
    if (orgBigIntId === null) {
      return [];
    }

    const trimmedPartnerName = partnerName.trim();
    if (!trimmedPartnerName) {
      return [];
    }

    const donorsWithUsage = await this.prisma.donor.findMany({
      where: {
        transactionDonors: {
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
        transactionDonors: {
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
            transactionDonors: {
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

    const result: DonorWithUsageAndLastUsed[] = donorsWithUsage.map((d) => ({
      ...this.mapToDonor(d),
      usageCount: d._count.transactionDonors,
      lastUsedAt: d.transactionDonors[0]?.transaction.transactionDate ?? null,
    }));

    result.sort((a, b) => b.usageCount - a.usageCount);

    return result;
  }

  async findByMatchCriteriaBatch(
    criteria: Array<{ name: string; address: string | null; donorType: DonorType }>,
  ): Promise<Donor[]> {
    if (criteria.length === 0) {
      return [];
    }

    const orConditions = criteria.map((c) => ({
      name: c.name,
      address: c.address,
      donorType: this.mapToPrismaDonorType(c.donorType),
    }));

    const donors = await this.prisma.donor.findMany({
      where: {
        OR: orConditions,
      },
    });

    return donors.map((d) => this.mapToDonor(d));
  }

  async createMany(donors: CreateDonorInput[], tx?: PrismaTransactionClient): Promise<Donor[]> {
    if (donors.length === 0) {
      return [];
    }

    const client = tx ?? this.prisma;

    const created = await client.donor.createManyAndReturn({
      data: donors.map((d) => ({
        donorType: this.mapToPrismaDonorType(d.donorType),
        name: d.name.trim(),
        address: d.address?.trim() || null,
        occupation: d.occupation?.trim() || null,
      })),
    });

    return created.map((d) => this.mapToDonor(d));
  }
}
