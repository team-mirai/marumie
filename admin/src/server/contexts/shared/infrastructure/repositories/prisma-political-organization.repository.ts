import type { PrismaClient } from "@prisma/client";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type {
  IPoliticalOrganizationRepository,
  UpdatePoliticalOrganizationInput,
} from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class PrismaPoliticalOrganizationRepository implements IPoliticalOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<PoliticalOrganization[]> {
    const organizations = await this.prisma.politicalOrganization.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return organizations.map((org) => ({
      id: org.id.toString(),
      displayName: org.displayName,
      orgName: org.orgName,
      slug: org.slug,
      description: org.description,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
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
      id: organization.id.toString(),
      displayName: organization.displayName,
      orgName: organization.orgName,
      slug: organization.slug,
      description: organization.description,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
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
      id: organization.id.toString(),
      displayName: organization.displayName,
      orgName: organization.orgName,
      slug: organization.slug,
      description: organization.description,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  async update(id: bigint, data: UpdatePoliticalOrganizationInput): Promise<PoliticalOrganization> {
    const organization = await this.prisma.politicalOrganization.update({
      where: { id },
      data: {
        displayName: data.displayName.trim(),
        orgName: data.orgName?.trim() || null,
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
      },
    });

    return {
      id: organization.id.toString(),
      displayName: organization.displayName,
      orgName: organization.orgName,
      slug: organization.slug,
      description: organization.description,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
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
