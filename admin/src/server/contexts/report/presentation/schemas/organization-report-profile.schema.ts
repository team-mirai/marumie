import { z } from "zod";
import { ORGANIZATION_REPORT_PROFILE_LIMITS as LIMITS } from "@/server/contexts/report/domain/models/organization-report-profile";

const representativeSchema = z.object({
  lastName: z.string().max(LIMITS.personName),
  firstName: z.string().max(LIMITS.personName),
});

const accountantSchema = z.object({
  lastName: z.string().max(LIMITS.personName),
  firstName: z.string().max(LIMITS.personName),
});

const contactPersonSchema = z.object({
  id: z.string(),
  lastName: z.string().max(LIMITS.personName),
  firstName: z.string().max(LIMITS.personName),
  tel: z.string().max(LIMITS.tel),
});

const fundManagementApplicantSchema = z.object({
  lastName: z.string().max(LIMITS.personName),
  firstName: z.string().max(LIMITS.personName),
});

const fundManagementPeriodSchema = z.object({
  id: z.string(),
  from: z.string().max(LIMITS.date),
  to: z.string().max(LIMITS.date),
});

const fundManagementSchema = z.object({
  publicPositionName: z.string().max(LIMITS.publicPositionName).optional(),
  publicPositionType: z.enum(["1", "2", "3", "4"]).optional(),
  applicant: fundManagementApplicantSchema.optional(),
  periods: z.array(fundManagementPeriodSchema).max(LIMITS.fundManagementPeriods).optional(),
});

const dietMemberSchema = z.object({
  id: z.string(),
  lastName: z.string().max(LIMITS.personName),
  firstName: z.string().max(LIMITS.personName),
  chamber: z.enum(["1", "2"]),
  positionType: z.enum(["1", "2", "3", "4"]),
});

const dietMemberPeriodSchema = z.object({
  id: z.string(),
  from: z.string().max(LIMITS.date),
  to: z.string().max(LIMITS.date),
});

const dietMemberRelationSchema = z.object({
  type: z.enum(["0", "1", "2", "3"]),
  members: z.array(dietMemberSchema).max(LIMITS.dietMembers).optional(),
  periods: z.array(dietMemberPeriodSchema).max(LIMITS.dietMemberPeriods).optional(),
});

const organizationReportProfileDetailsSchema = z.object({
  representative: representativeSchema.optional(),
  accountant: accountantSchema.optional(),
  contactPersons: z.array(contactPersonSchema).max(LIMITS.contactPersons).optional(),
  organizationType: z.string().max(LIMITS.organizationType).optional(),
  activityArea: z.enum(["1", "2"]).optional(),
  fundManagement: fundManagementSchema.optional(),
  dietMemberRelation: dietMemberRelationSchema.optional(),
  specificPartyDate: z.string().max(LIMITS.date).optional(),
});

const organizationReportProfileFormSchema = z.object({
  id: z.string().optional(),
  politicalOrganizationId: z.string(),
  financialYear: z.number().int().min(1900).max(2100),
  officialName: z.string().max(LIMITS.officialName).optional().nullable(),
  officialNameKana: z.string().max(LIMITS.officialNameKana).optional().nullable(),
  officeAddress: z.string().max(LIMITS.officeAddress).optional().nullable(),
  officeAddressBuilding: z.string().max(LIMITS.officeAddressBuilding).optional().nullable(),
  details: organizationReportProfileDetailsSchema.default({}),
});

export type OrganizationReportProfileFormData = z.infer<typeof organizationReportProfileFormSchema>;
