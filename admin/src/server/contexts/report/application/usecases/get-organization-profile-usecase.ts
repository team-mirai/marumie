import "server-only";

import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";

export interface GetOrganizationProfileInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export class GetOrganizationProfileUsecase {
  constructor(private repository: IOrganizationReportProfileRepository) {}

  async execute(
    input: GetOrganizationProfileInput,
  ): Promise<OrganizationReportProfile | null> {
    return this.repository.findByOrganizationIdAndYear(
      input.politicalOrganizationId,
      input.financialYear,
    );
  }
}
