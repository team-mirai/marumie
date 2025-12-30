import { z } from "zod";

const representativeSchema = z.object({
  lastName: z.string().max(30, "姓は30文字以内で入力してください"),
  firstName: z.string().max(30, "名は30文字以内で入力してください"),
});

const accountantSchema = z.object({
  lastName: z.string().max(30, "姓は30文字以内で入力してください"),
  firstName: z.string().max(30, "名は30文字以内で入力してください"),
});

const contactPersonSchema = z.object({
  id: z.string(),
  lastName: z.string().max(30, "姓は30文字以内で入力してください"),
  firstName: z.string().max(30, "名は30文字以内で入力してください"),
  tel: z.string().max(20, "電話番号は20文字以内で入力してください"),
});

const fundManagementApplicantSchema = z.object({
  lastName: z.string().max(30, "姓は30文字以内で入力してください"),
  firstName: z.string().max(30, "名は30文字以内で入力してください"),
});

const fundManagementPeriodSchema = z.object({
  id: z.string(),
  from: z.string().max(20, "開始日は20文字以内で入力してください"),
  to: z.string().max(20, "終了日は20文字以内で入力してください"),
});

const fundManagementSchema = z.object({
  publicPositionName: z.string().max(60, "公職の名称は60文字以内で入力してください").optional(),
  publicPositionType: z.enum(["1", "2", "3", "4"]).optional(),
  applicant: fundManagementApplicantSchema.optional(),
  periods: z.array(fundManagementPeriodSchema).max(3).optional(),
});

const dietMemberSchema = z.object({
  id: z.string(),
  lastName: z.string().max(30, "姓は30文字以内で入力してください"),
  firstName: z.string().max(30, "名は30文字以内で入力してください"),
  chamber: z.enum(["1", "2"]),
  positionType: z.enum(["1", "2", "3", "4"]),
});

const dietMemberPeriodSchema = z.object({
  id: z.string(),
  from: z.string().max(20, "開始日は20文字以内で入力してください"),
  to: z.string().max(20, "終了日は20文字以内で入力してください"),
});

const dietMemberRelationSchema = z.object({
  type: z.enum(["0", "1", "2", "3"]),
  members: z.array(dietMemberSchema).max(3).optional(),
  periods: z.array(dietMemberPeriodSchema).max(3).optional(),
});

const organizationReportProfileDetailsSchema = z.object({
  representative: representativeSchema.optional(),
  accountant: accountantSchema.optional(),
  contactPersons: z.array(contactPersonSchema).max(3).optional(),
  organizationType: z.string().max(2, "団体区分は2文字以内で入力してください").optional(),
  activityArea: z.enum(["1", "2"]).optional(),
  fundManagement: fundManagementSchema.optional(),
  dietMemberRelation: dietMemberRelationSchema.optional(),
  specificPartyDate: z.string().max(20, "開催日は20文字以内で入力してください").optional(),
});

const organizationReportProfileFormSchema = z.object({
  id: z.string().optional(),
  politicalOrganizationId: z.string(),
  financialYear: z.number().int().min(1900).max(2100),
  officialName: z
    .string()
    .max(120, "団体名称は120文字以内で入力してください")
    .optional()
    .nullable(),
  officialNameKana: z
    .string()
    .max(120, "団体名称（カナ）は120文字以内で入力してください")
    .optional()
    .nullable(),
  officeAddress: z
    .string()
    .max(80, "事務所所在地は80文字以内で入力してください")
    .optional()
    .nullable(),
  officeAddressBuilding: z
    .string()
    .max(60, "建物名等は60文字以内で入力してください")
    .optional()
    .nullable(),
  details: organizationReportProfileDetailsSchema.default({}),
});

export type OrganizationReportProfileFormData = z.infer<typeof organizationReportProfileFormSchema>;
