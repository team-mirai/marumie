import type {
  CreateOrganizationReportProfileInput,
  OrganizationReportProfile,
  UpdateOrganizationReportProfileInput,
} from "@/server/contexts/report/domain/models/organization-report-profile";

export interface IOrganizationReportProfileRepository {
  /**
   * Find a profile by organization ID and financial year.
   */
  findByOrganizationIdAndYear(
    politicalOrganizationId: string,
    financialYear: number,
  ): Promise<OrganizationReportProfile | null>;

  /**
   * Create a new organization report profile.
   */
  create(input: CreateOrganizationReportProfileInput): Promise<OrganizationReportProfile>;

  /**
   * Update an existing organization report profile.
   */
  update(
    id: string,
    input: UpdateOrganizationReportProfileInput,
  ): Promise<OrganizationReportProfile>;
}
