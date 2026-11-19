import "server-only";

import type {
  PrismaClient,
  PoliticalOrganization as PrismaPoliticalOrganization,
} from "@prisma/client";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

export class PrismaPoliticalOrganizationRepository implements IPoliticalOrganizationRepository {
  constructor(private prisma: PrismaClient) {}

  async findBySlug(slug: string): Promise<PoliticalOrganization | null> {
    const organization = await this.prisma.politicalOrganization.findUnique({
      where: { slug },
    });

    return organization ? this.mapToPoliticalOrganization(organization) : null;
  }

  async findBySlugs(slugs: string[]): Promise<PoliticalOrganization[]> {
    const organizations = await this.prisma.politicalOrganization.findMany({
      where: { slug: { in: slugs } },
    });

    return organizations.map((org) => this.mapToPoliticalOrganization(org));
  }

  async findById(id: string): Promise<PoliticalOrganization | null> {
    const organization = await this.prisma.politicalOrganization.findUnique({
      where: { id: BigInt(id) },
    });

    return organization ? this.mapToPoliticalOrganization(organization) : null;
  }

  async findAll(): Promise<PoliticalOrganization[]> {
    const organizations = await this.prisma.politicalOrganization.findMany({
      orderBy: { displayName: "desc" },
    });

    return organizations.map((org) => this.mapToPoliticalOrganization(org));
  }

  async findTypeCodesByIds(ids: string[]): Promise<Map<string, string[]>> {
    const profiles = await this.prisma.organizationReportProfile.findMany({
      where: { politicalOrganizationId: { in: ids.map((id) => BigInt(id)) } },
      select: { politicalOrganizationId: true, details: true },
    });

    const typeCodesById = new Map<string, string[]>();
    for (const profile of profiles) {
      const { details } = profile;
      const typeCode =
        details && typeof details === "object" && !Array.isArray(details)
          ? details.organizationType
          : undefined;
      if (typeof typeCode !== "string" || typeCode === "") continue;
      const id = profile.politicalOrganizationId.toString();
      typeCodesById.set(id, [...(typeCodesById.get(id) ?? []), typeCode]);
    }
    return typeCodesById;
  }

  private mapToPoliticalOrganization(
    prismaOrganization: PrismaPoliticalOrganization,
  ): PoliticalOrganization {
    return {
      id: prismaOrganization.id.toString(),
      displayName: prismaOrganization.displayName,
      orgName: prismaOrganization.orgName,
      slug: prismaOrganization.slug,
      description: prismaOrganization.description,
      websiteUrl: prismaOrganization.websiteUrl,
      snsUrls: prismaOrganization.snsUrls,
      photoPath: prismaOrganization.photoPath,
      createdAt: prismaOrganization.createdAt,
      updatedAt: prismaOrganization.updatedAt,
    };
  }
}
