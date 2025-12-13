import "server-only";

import type {
  CreateOrganizationReportProfileInput,
  OrganizationReportProfile,
  UpdateOrganizationReportProfileInput,
} from "@/server/contexts/report/domain/models/organization-report-profile";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";

export interface SaveOrganizationProfileInput {
  id?: string;
  politicalOrganizationId: string;
  financialYear: number;
  officialName?: string | null;
  officialNameKana?: string | null;
  officeAddress?: string | null;
  officeAddressBuilding?: string | null;
  details?: CreateOrganizationReportProfileInput["details"];
}

export class SaveOrganizationProfileUsecase {
  constructor(private repository: IOrganizationReportProfileRepository) {}

  async execute(
    input: SaveOrganizationProfileInput,
  ): Promise<OrganizationReportProfile> {
    if (input.id) {
      const updateInput: UpdateOrganizationReportProfileInput = {
        officialName: input.officialName,
        officialNameKana: input.officialNameKana,
        officeAddress: input.officeAddress,
        officeAddressBuilding: input.officeAddressBuilding,
        details: input.details,
      };
      return this.repository.update(input.id, updateInput);
    }

    const createInput: CreateOrganizationReportProfileInput = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
      officialName: input.officialName,
      officialNameKana: input.officialNameKana,
      officeAddress: input.officeAddress,
      officeAddressBuilding: input.officeAddressBuilding,
      details: input.details,
    };
    return this.repository.create(createInput);
  }
}
