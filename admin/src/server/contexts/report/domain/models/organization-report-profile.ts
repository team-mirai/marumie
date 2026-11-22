/**
 * OrganizationReportProfile
 *
 * Domain model for political organization report profile (SYUUSHI07_01).
 * Contains organization information required for the political fund report.
 */

import {
  type ValidationError,
  ValidationErrorCode,
} from "@/server/contexts/report/domain/types/validation";

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

// ============================================================
// Domain Logic
// ============================================================

/**
 * 報告書プロフィールの文字数・件数・桁数の上限
 *
 * 入力スキーマと画面の入力欄はこの値を参照する。
 */
export const ORGANIZATION_REPORT_PROFILE_LIMITS = {
  /** 政治団体の名称 (DANTAI_NM) */
  officialName: 120,
  /** 政治団体の名称（ふりがな） (DANTAI_KANA) */
  officialNameKana: 120,
  /** 主たる事務所の所在地 (JIM_ADR) */
  officeAddress: 80,
  /** 主たる事務所の建物名等 */
  officeAddressBuilding: 60,
  /** 人の姓・名（代表者・会計責任者・事務担当者・届出者・議員） */
  personName: 30,
  /** 事務担当者の電話番号 */
  tel: 20,
  /** 資金管理団体の公職の名称 */
  publicPositionName: 60,
  /** 和暦の日付（指定期間・特定パーティー開催日） */
  date: 20,
  /** 団体区分 (DANTAI_KBN) の桁数 */
  organizationType: 2,
  /** 事務担当者の最大人数 */
  contactPersons: 3,
  /** 資金管理団体の指定期間の最大件数 */
  fundManagementPeriods: 3,
  /** 国会議員関係政治団体の議員の最大人数 */
  dietMembers: 3,
  /** 国会議員関係政治団体の指定期間の最大件数 */
  dietMemberPeriods: 3,
} as const;

const LIMITS = ORGANIZATION_REPORT_PROFILE_LIMITS;

function maxLengthError(
  path: string,
  value: string | null | undefined,
  max: number,
  label: string,
): ValidationError[] {
  if (!value || value.length <= max) return [];
  return [
    {
      path,
      code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
      message: `${label}は${max}文字以内で入力してください`,
      severity: "error",
    },
  ];
}

function maxCountError(
  path: string,
  items: unknown[] | undefined,
  max: number,
  label: string,
): ValidationError[] {
  if (!items || items.length <= max) return [];
  return [
    {
      path,
      code: ValidationErrorCode.MAX_COUNT_EXCEEDED,
      message: `${label}は${max}件まで登録できます`,
      severity: "error",
    },
  ];
}

function personNameErrors(
  path: string,
  person: { lastName?: string; firstName?: string } | undefined,
  label: string,
): ValidationError[] {
  if (!person) return [];
  return [
    ...maxLengthError(`${path}.lastName`, person.lastName, LIMITS.personName, `${label}の姓`),
    ...maxLengthError(`${path}.firstName`, person.firstName, LIMITS.personName, `${label}の名`),
  ];
}

function periodErrors(
  path: string,
  periods: { from: string; to: string }[] | undefined,
  label: string,
): ValidationError[] {
  return (periods ?? []).flatMap((period, i) => [
    ...maxLengthError(
      `${path}[${i}].from`,
      period.from,
      LIMITS.date,
      `${label}（${i + 1}件目）の開始日`,
    ),
    ...maxLengthError(
      `${path}[${i}].to`,
      period.to,
      LIMITS.date,
      `${label}（${i + 1}件目）の終了日`,
    ),
  ]);
}

/**
 * 文字数・件数・桁数の上限を検証する（必須は見ない）
 */
function validateLimits(profile: UpdateOrganizationReportProfileInput): ValidationError[] {
  const details = profile.details ?? {};
  const contactPersons = details.contactPersons;
  const fundManagement = details.fundManagement;
  const dietMemberRelation = details.dietMemberRelation;

  return [
    ...maxLengthError(
      "profile.officialName",
      profile.officialName,
      LIMITS.officialName,
      "政治団体の名称",
    ),
    ...maxLengthError(
      "profile.officialNameKana",
      profile.officialNameKana,
      LIMITS.officialNameKana,
      "政治団体の名称（ふりがな）",
    ),
    ...maxLengthError(
      "profile.officeAddress",
      profile.officeAddress,
      LIMITS.officeAddress,
      "主たる事務所の所在地",
    ),
    ...maxLengthError(
      "profile.officeAddressBuilding",
      profile.officeAddressBuilding,
      LIMITS.officeAddressBuilding,
      "主たる事務所の建物名等",
    ),
    ...personNameErrors("profile.details.representative", details.representative, "代表者"),
    ...personNameErrors("profile.details.accountant", details.accountant, "会計責任者"),
    ...maxCountError(
      "profile.details.contactPersons",
      contactPersons,
      LIMITS.contactPersons,
      "事務担当者",
    ),
    ...(contactPersons ?? []).flatMap((person, i) => [
      ...personNameErrors(
        `profile.details.contactPersons[${i}]`,
        person,
        `事務担当者（${i + 1}人目）`,
      ),
      ...maxLengthError(
        `profile.details.contactPersons[${i}].tel`,
        person.tel,
        LIMITS.tel,
        `事務担当者（${i + 1}人目）の電話番号`,
      ),
    ]),
    ...maxLengthError(
      "profile.details.organizationType",
      details.organizationType,
      LIMITS.organizationType,
      "団体区分",
    ),
    ...maxLengthError(
      "profile.details.fundManagement.publicPositionName",
      fundManagement?.publicPositionName,
      LIMITS.publicPositionName,
      "資金管理団体の公職の名称",
    ),
    ...personNameErrors(
      "profile.details.fundManagement.applicant",
      fundManagement?.applicant,
      "資金管理団体の届出者",
    ),
    ...maxCountError(
      "profile.details.fundManagement.periods",
      fundManagement?.periods,
      LIMITS.fundManagementPeriods,
      "資金管理団体の指定期間",
    ),
    ...periodErrors(
      "profile.details.fundManagement.periods",
      fundManagement?.periods,
      "資金管理団体の指定期間",
    ),
    ...maxCountError(
      "profile.details.dietMemberRelation.members",
      dietMemberRelation?.members,
      LIMITS.dietMembers,
      "国会議員関係政治団体の議員",
    ),
    ...(dietMemberRelation?.members ?? []).flatMap((member, i) =>
      personNameErrors(
        `profile.details.dietMemberRelation.members[${i}]`,
        member,
        `国会議員関係政治団体の議員（${i + 1}人目）`,
      ),
    ),
    ...maxCountError(
      "profile.details.dietMemberRelation.periods",
      dietMemberRelation?.periods,
      LIMITS.dietMemberPeriods,
      "国会議員関係政治団体の指定期間",
    ),
    ...periodErrors(
      "profile.details.dietMemberRelation.periods",
      dietMemberRelation?.periods,
      "国会議員関係政治団体の指定期間",
    ),
    ...maxLengthError(
      "profile.details.specificPartyDate",
      details.specificPartyDate,
      LIMITS.date,
      "特定パーティーの開催日",
    ),
  ];
}

/**
 * 必須・選択値を検証する（上限は validateLimits が見る）
 */
function validateRequired(profile: OrganizationReportProfile): ValidationError[] {
  const errors: ValidationError[] = [];
  const required = (path: string, message: string) =>
    errors.push({ path, code: ValidationErrorCode.REQUIRED, message, severity: "error" });

  // 報告年 (HOUKOKU_NEN): 必須、4桁数字
  if (!profile.financialYear) {
    required("profile.financialYear", "報告年が入力されていません");
  } else if (profile.financialYear < 1000 || profile.financialYear > 9999) {
    errors.push({
      path: "profile.financialYear",
      code: ValidationErrorCode.INVALID_FORMAT,
      message: "報告年は4桁の数字で入力してください",
      severity: "error",
    });
  }

  if (!profile.officialName) {
    required("profile.officialName", "政治団体の名称が入力されていません");
  }
  if (!profile.officialNameKana) {
    required("profile.officialNameKana", "政治団体の名称（ふりがな）が入力されていません");
  }
  if (!profile.officeAddress) {
    required("profile.officeAddress", "主たる事務所の所在地が入力されていません");
  }

  const representative = profile.details.representative;
  if (!representative) {
    required("profile.details.representative", "代表者の氏名が入力されていません");
  } else {
    if (!representative.lastName) {
      required("profile.details.representative.lastName", "代表者の姓が入力されていません");
    }
    if (!representative.firstName) {
      required("profile.details.representative.firstName", "代表者の名が入力されていません");
    }
  }

  const accountant = profile.details.accountant;
  if (!accountant) {
    required("profile.details.accountant", "会計責任者の氏名が入力されていません");
  } else {
    if (!accountant.lastName) {
      required("profile.details.accountant.lastName", "会計責任者の姓が入力されていません");
    }
    if (!accountant.firstName) {
      required("profile.details.accountant.firstName", "会計責任者の名が入力されていません");
    }
  }

  // 活動区域 (KATU_KUKI): 必須、"1" or "2"
  const activityArea = profile.details.activityArea;
  if (!activityArea) {
    required("profile.details.activityArea", "活動区域が選択されていません");
  } else if (activityArea !== "1" && activityArea !== "2") {
    errors.push({
      path: "profile.details.activityArea",
      code: ValidationErrorCode.INVALID_VALUE,
      message: "活動区域の値が不正です（1: 二以上の都道府県、2: 一つの都道府県）",
      severity: "error",
    });
  }

  // 国会議員関係政治団体の区分 (GIIN_DANTAI_KBN): 必須、"0"〜"3"
  const dietMemberRelation = profile.details.dietMemberRelation;
  if (!dietMemberRelation) {
    required(
      "profile.details.dietMemberRelation",
      "国会議員関係政治団体の区分が選択されていません",
    );
  } else if (!["0", "1", "2", "3"].includes(dietMemberRelation.type)) {
    errors.push({
      path: "profile.details.dietMemberRelation.type",
      code: ValidationErrorCode.INVALID_VALUE,
      message:
        "国会議員関係政治団体の区分の値が不正です（0: 指定無し、1: 1号団体、2: 2号団体、3: 両方）",
      severity: "error",
    });
  }

  return errors;
}

/**
 * OrganizationReportProfile に関連するドメインロジック
 */
export const OrganizationReportProfile = {
  /**
   * プロフィールのバリデーションを実行する（報告書の出力用。必須と上限の両方を見る）
   *
   * SYUUSHI07_01（団体基本情報）のバリデーション:
   * - 報告年 (HOUKOKU_NEN): 必須、4桁数字
   * - 政治団体名称 (DANTAI_NM)・ふりがな (DANTAI_KANA)・事務所住所 (JIM_ADR): 必須
   * - 代表者氏名 (DAI_NM1, DAI_NM2)・会計責任者氏名 (KAI_NM1, KAI_NM2): 必須
   * - 活動区域 (KATU_KUKI): 必須、"1" or "2"
   * - 国会議員関係政治団体の区分 (GIIN_DANTAI_KBN): 必須、"0"〜"3"
   * - 文字数・件数・桁数: ORGANIZATION_REPORT_PROFILE_LIMITS 以内
   *
   * 注: 資金管理団体の指定の有無 (SIKIN_UMU) はfundManagementの存在有無から自動導出されるためバリデーション不要
   */
  validate: (profile: OrganizationReportProfile): ValidationError[] => [
    ...validateRequired(profile),
    ...validateLimits(profile),
  ],

  /**
   * 保存時のバリデーション（上限だけを見る）
   *
   * 入力途中のプロフィールも保存できるよう、必須は見ない。
   */
  validateForSave: (profile: UpdateOrganizationReportProfileInput): ValidationError[] =>
    validateLimits(profile),
} as const;
