import type { PrismaClient } from "@prisma/client";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type {
  IPoliticalOrganizationRepository,
  UpdatePoliticalOrganizationData,
} from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class PrismaPoliticalOrganizationRepository implements IPoliticalOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<PoliticalOrganization[]> {
    const organizations = await this.prisma.politicalOrganization.findMany({
      orderBy: { id: "asc" },
    });

    return organizations.map((org) => ({
      ...org,
      id: org.id.toString(),
    }));
  }

  async findById(id: bigint): Promise<PoliticalOrganization | null> {
    const organization = await this.prisma.politicalOrganization.findUnique({
      where: { id },
    });

    if (!organization) {
      return null;
    }

    return {
      ...organization,
      id: organization.id.toString(),
    };
  }

  async create(
    displayName: string,
    slug: string,
    orgName?: string,
    description?: string,
  ): Promise<PoliticalOrganization> {
    const cleanDisplayName = displayName.trim();
    const cleanSlug = slug.trim();
    const cleanOrgName = orgName?.trim() || undefined;
    const cleanDescription = description?.trim() || undefined;

    const organization = await this.prisma.politicalOrganization.create({
      data: {
        displayName: cleanDisplayName,
        slug: cleanSlug,
        orgName: cleanOrgName,
        description: cleanDescription,
      },
    });

    return {
      ...organization,
      id: organization.id.toString(),
    };
  }

  async update(id: bigint, data: UpdatePoliticalOrganizationData): Promise<PoliticalOrganization> {
    const organization = await this.prisma.politicalOrganization.update({
      where: { id },
      data: {
        displayName: data.displayName.trim(),
        slug: data.slug.trim(),
        orgName: data.orgName?.trim() || null,
        description: data.description?.trim() || null,
      },
    });

    return {
      ...organization,
      id: organization.id.toString(),
    };
  }

  async delete(id: bigint): Promise<void> {
    await this.prisma.politicalOrganization.delete({
      where: { id },
    });
  }

  async countTransactions(id: bigint): Promise<number> {
    return await this.prisma.transaction.count({
      where: { politicalOrganizationId: id },
    });
  }
}
