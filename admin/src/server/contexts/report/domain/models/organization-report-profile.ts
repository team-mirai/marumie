/**
 * OrganizationReportProfile
 *
 * Domain model for political organization report profile (SYUUSHI07_01).
 * Contains organization information required for the political fund report.
 */

/**
 * 代表者情報
 */
export interface Representative {
  lastName: string;
  firstName: string;
}

/**
 * 会計責任者情報
 */
export interface Accountant {
  lastName: string;
  firstName: string;
}

/**
 * 事務担当者情報（最大3名）
 */
export interface ContactPerson {
  id: string;
  lastName: string;
  firstName: string;
  tel: string;
}

/**
 * 資金管理団体の届出者情報
 */
export interface FundManagementApplicant {
  lastName: string;
  firstName: string;
}

/**
 * 資金管理団体の指定期間
 */
export interface FundManagementPeriod {
  id: string;
  from: string; // 和暦 ge/m/d
  to: string; // 和暦 ge/m/d
}

/**
 * 資金管理団体情報
 */
export interface FundManagement {
  publicPositionName?: string;
  publicPositionType?: "1" | "2" | "3" | "4";
  applicant?: FundManagementApplicant;
  periods?: FundManagementPeriod[];
}

/**
 * 国会議員関係の議員情報
 */
export interface DietMember {
  id: string;
  lastName: string;
  firstName: string;
  chamber: "1" | "2"; // 1:衆議院議員 2:参議院議員
  positionType: "1" | "2" | "3" | "4";
}

/**
 * 国会議員関係の指定期間
 */
export interface DietMemberPeriod {
  id: string;
  from: string; // 和暦 ge/m/d
  to: string; // 和暦 ge/m/d
}

/**
 * 国会議員関係政治団体情報
 */
export interface DietMemberRelation {
  type: "0" | "1" | "2" | "3"; // 0:指定無し 1:1号団体 2:2号団体 3:両方
  members?: DietMember[];
  periods?: DietMemberPeriod[];
}

/**
 * OrganizationReportProfileDetails
 *
 * JSON structure stored in the `details` column.
 */
export interface OrganizationReportProfileDetails {
  representative?: Representative;
  accountant?: Accountant;
  contactPersons?: ContactPerson[];
  organizationType?: string; // DANTAI_KBN (2桁コード)
  activityArea?: "1" | "2"; // 1: 二以上の都道府県 2: 一つの都道府県
  fundManagement?: FundManagement;
  dietMemberRelation?: DietMemberRelation;
  specificPartyDate?: string; // 和暦 ge/m/d
}

/**
 * OrganizationReportProfile
 *
 * Domain model representing a political organization's report profile.
 */
export interface OrganizationReportProfile {
  id: string;
  politicalOrganizationId: string;
  financialYear: number;
  officialName: string | null;
  officialNameKana: string | null;
  officeAddress: string | null;
  officeAddressBuilding: string | null;
  details: OrganizationReportProfileDetails;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CreateOrganizationReportProfileInput
 *
 * Input for creating a new organization report profile.
 */
export interface CreateOrganizationReportProfileInput {
  politicalOrganizationId: string;
  financialYear: number;
  officialName?: string | null;
  officialNameKana?: string | null;
  officeAddress?: string | null;
  officeAddressBuilding?: string | null;
  details?: OrganizationReportProfileDetails;
}

/**
 * UpdateOrganizationReportProfileInput
 *
 * Input for updating an existing organization report profile.
 */
export interface UpdateOrganizationReportProfileInput {
  officialName?: string | null;
  officialNameKana?: string | null;
  officeAddress?: string | null;
  officeAddressBuilding?: string | null;
  details?: OrganizationReportProfileDetails;
}
