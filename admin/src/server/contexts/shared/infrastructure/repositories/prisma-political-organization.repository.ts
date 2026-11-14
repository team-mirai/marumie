import type {
  PrismaClient,
  PoliticalOrganization as PrismaPoliticalOrganization,
} from "@prisma/client";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type {
  IPoliticalOrganizationRepository,
  UpdatePoliticalOrganizationInput,
} from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

function toModel(row: PrismaPoliticalOrganization): PoliticalOrganization {
  return {
    id: row.id.toString(),
    displayName: row.displayName,
    orgName: row.orgName,
    slug: row.slug,
    description: row.description,
    websiteUrl: row.websiteUrl,
    snsUrls: row.snsUrls,
    photoPath: row.photoPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaPoliticalOrganizationRepository implements IPoliticalOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<PoliticalOrganization[]> {
    const organizations = await this.prisma.politicalOrganization.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return organizations.map(toModel);
  }

  async findById(id: bigint): Promise<PoliticalOrganization | null> {
    const organization = await this.prisma.politicalOrganization.findUnique({
      where: { id },
    });

    if (!organization) {
      return null;
    }

    return toModel(organization);
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

    return toModel(organization);
  }

  async update(id: bigint, data: UpdatePoliticalOrganizationInput): Promise<PoliticalOrganization> {
    const organization = await this.prisma.politicalOrganization.update({
      where: { id },
      data: {
        displayName: data.displayName.trim(),
        orgName: data.orgName?.trim() || null,
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl.trim() || null }),
        ...(data.snsUrls !== undefined && { snsUrls: data.snsUrls }),
      },
    });

    return toModel(organization);
  }

  async setPhotoPath(id: bigint, photoPath: string | null): Promise<void> {
    await this.prisma.politicalOrganization.update({ where: { id }, data: { photoPath } });
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
