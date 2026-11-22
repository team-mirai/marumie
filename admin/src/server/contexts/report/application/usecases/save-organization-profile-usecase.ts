import "server-only";

import {
  type CreateOrganizationReportProfileInput,
  OrganizationReportProfile,
  type UpdateOrganizationReportProfileInput,
} from "@/server/contexts/report/domain/models/organization-report-profile";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";

interface SaveOrganizationProfileInput {
  id?: string;
  politicalOrganizationId: string;
  financialYear: number;
  officialName?: string | null;
  officialNameKana?: string | null;
  officeAddress?: string | null;
  officeAddressBuilding?: string | null;
  details?: CreateOrganizationReportProfileInput["details"];
}

type SaveOrganizationProfileResult =
  | { success: true; profile: OrganizationReportProfile }
  | { success: false; errors: string[] };

export class SaveOrganizationProfileUsecase {
  constructor(private repository: IOrganizationReportProfileRepository) {}

  async execute(input: SaveOrganizationProfileInput): Promise<SaveOrganizationProfileResult> {
    const errors = OrganizationReportProfile.validateForSave(input);
    if (errors.length > 0) {
      return { success: false, errors: errors.map((error) => error.message) };
    }

    return { success: true, profile: await this.save(input) };
  }

  private async save(input: SaveOrganizationProfileInput): Promise<OrganizationReportProfile> {
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
