import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";
import type {
  CreateOrganizationReportProfileInput,
  OrganizationReportProfile,
  OrganizationReportProfileDetails,
  UpdateOrganizationReportProfileInput,
} from "@/server/contexts/report/domain/models/organization-report-profile";

export class PrismaOrganizationReportProfileRepository
  implements IOrganizationReportProfileRepository
{
  constructor(private prisma: PrismaClient) {}

  async findByOrganizationIdAndYear(
    politicalOrganizationId: string,
    financialYear: number,
  ): Promise<OrganizationReportProfile | null> {
    const profile = await this.prisma.organizationReportProfile.findUnique({
      where: {
        politicalOrganizationId_financialYear: {
          politicalOrganizationId: BigInt(politicalOrganizationId),
          financialYear,
        },
      },
    });

    if (!profile) {
      return null;
    }

    return this.mapToModel(profile);
  }

  async create(input: CreateOrganizationReportProfileInput): Promise<OrganizationReportProfile> {
    const profile = await this.prisma.organizationReportProfile.create({
      data: {
        politicalOrganizationId: BigInt(input.politicalOrganizationId),
        financialYear: input.financialYear,
        officialName: input.officialName ?? null,
        officialNameKana: input.officialNameKana ?? null,
        officeAddress: input.officeAddress ?? null,
        officeAddressBuilding: input.officeAddressBuilding ?? null,
        details: (input.details ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToModel(profile);
  }

  async update(
    id: string,
    input: UpdateOrganizationReportProfileInput,
  ): Promise<OrganizationReportProfile> {
    const profile = await this.prisma.organizationReportProfile.update({
      where: { id: BigInt(id) },
      data: {
        officialName: input.officialName,
        officialNameKana: input.officialNameKana,
        officeAddress: input.officeAddress,
        officeAddressBuilding: input.officeAddressBuilding,
        details: input.details ? (input.details as Prisma.InputJsonValue) : undefined,
      },
    });

    return this.mapToModel(profile);
  }

  private mapToModel(profile: {
    id: bigint;
    politicalOrganizationId: bigint;
    financialYear: number;
    officialName: string | null;
    officialNameKana: string | null;
    officeAddress: string | null;
    officeAddressBuilding: string | null;
    details: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationReportProfile {
    return {
      id: profile.id.toString(),
      politicalOrganizationId: profile.politicalOrganizationId.toString(),
      financialYear: profile.financialYear,
      officialName: profile.officialName,
      officialNameKana: profile.officialNameKana,
      officeAddress: profile.officeAddress,
      officeAddressBuilding: profile.officeAddressBuilding,
      details: (profile.details as OrganizationReportProfileDetails) ?? {},
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
