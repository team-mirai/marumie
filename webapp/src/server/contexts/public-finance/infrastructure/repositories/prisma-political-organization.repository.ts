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
      orderBy: { displayName: "asc" },
    });

    return organizations.map((org) => this.mapToPoliticalOrganization(org));
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
      createdAt: prismaOrganization.createdAt,
      updatedAt: prismaOrganization.updatedAt,
    };
  }
}
