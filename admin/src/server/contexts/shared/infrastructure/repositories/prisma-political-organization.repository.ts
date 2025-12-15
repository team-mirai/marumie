import type { PrismaClient } from "@prisma/client";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class PrismaPoliticalOrganizationRepository implements IPoliticalOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

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
