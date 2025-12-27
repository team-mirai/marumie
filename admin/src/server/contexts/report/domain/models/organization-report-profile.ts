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
 * OrganizationReportProfile に関連するドメインロジック
 */
export const OrganizationReportProfile = {
  /**
   * プロフィールのバリデーションを実行する
   *
   * SYUUSHI07_01（団体基本情報）のバリデーション:
   * - 報告年 (HOUKOKU_NEN): 必須、4桁数字
   * - 政治団体名称 (DANTAI_NM): 必須、120文字以内
   * - 政治団体ふりがな (DANTAI_KANA): 必須、120文字以内
   * - 事務所住所 (JIM_ADR): 必須、80文字以内
   * - 代表者氏名 (DAI_NM1, DAI_NM2): 必須、各30文字以内
   * - 会計責任者氏名 (KAI_NM1, KAI_NM2): 必須、各30文字以内
   * - 活動区域 (KATU_KUKI): 必須、"1" or "2"
   * - 資金管理団体の指定の有無 (SIKIN_UMU): 必須、"0" or "1"
   * - 国会議員関係政治団体の区分 (GIIN_DANTAI_KBN): 必須、"0"〜"3"
   */
  validate: (profile: OrganizationReportProfile): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 報告年 (HOUKOKU_NEN): 必須、4桁数字
    if (!profile.financialYear) {
      errors.push({
        path: "profile.financialYear",
        code: ValidationErrorCode.REQUIRED,
        message: "報告年が入力されていません",
        severity: "error",
      });
    } else if (profile.financialYear < 1000 || profile.financialYear > 9999) {
      errors.push({
        path: "profile.financialYear",
        code: ValidationErrorCode.INVALID_FORMAT,
        message: "報告年は4桁の数字で入力してください",
        severity: "error",
      });
    }

    // 政治団体名称 (DANTAI_NM): 必須、120文字以内
    if (!profile.officialName) {
      errors.push({
        path: "profile.officialName",
        code: ValidationErrorCode.REQUIRED,
        message: "政治団体の名称が入力されていません",
        severity: "error",
      });
    } else if (profile.officialName.length > 120) {
      errors.push({
        path: "profile.officialName",
        code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
        message: "政治団体の名称は120文字以内で入力してください",
        severity: "error",
      });
    }

    // 政治団体ふりがな (DANTAI_KANA): 必須、120文字以内
    if (!profile.officialNameKana) {
      errors.push({
        path: "profile.officialNameKana",
        code: ValidationErrorCode.REQUIRED,
        message: "政治団体の名称（ふりがな）が入力されていません",
        severity: "error",
      });
    } else if (profile.officialNameKana.length > 120) {
      errors.push({
        path: "profile.officialNameKana",
        code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
        message: "政治団体の名称（ふりがな）は120文字以内で入力してください",
        severity: "error",
      });
    }

    // 事務所住所 (JIM_ADR): 必須、80文字以内
    if (!profile.officeAddress) {
      errors.push({
        path: "profile.officeAddress",
        code: ValidationErrorCode.REQUIRED,
        message: "主たる事務所の所在地が入力されていません",
        severity: "error",
      });
    } else if (profile.officeAddress.length > 80) {
      errors.push({
        path: "profile.officeAddress",
        code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
        message: "主たる事務所の所在地は80文字以内で入力してください",
        severity: "error",
      });
    }

    // 代表者氏名 (DAI_NM1, DAI_NM2): 必須、各30文字以内
    const representative = profile.details.representative;
    if (!representative) {
      errors.push({
        path: "profile.details.representative",
        code: ValidationErrorCode.REQUIRED,
        message: "代表者の氏名が入力されていません",
        severity: "error",
      });
    } else {
      if (!representative.lastName) {
        errors.push({
          path: "profile.details.representative.lastName",
          code: ValidationErrorCode.REQUIRED,
          message: "代表者の姓が入力されていません",
          severity: "error",
        });
      } else if (representative.lastName.length > 30) {
        errors.push({
          path: "profile.details.representative.lastName",
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: "代表者の姓は30文字以内で入力してください",
          severity: "error",
        });
      }

      if (!representative.firstName) {
        errors.push({
          path: "profile.details.representative.firstName",
          code: ValidationErrorCode.REQUIRED,
          message: "代表者の名が入力されていません",
          severity: "error",
        });
      } else if (representative.firstName.length > 30) {
        errors.push({
          path: "profile.details.representative.firstName",
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: "代表者の名は30文字以内で入力してください",
          severity: "error",
        });
      }
    }

    // 会計責任者氏名 (KAI_NM1, KAI_NM2): 必須、各30文字以内
    const accountant = profile.details.accountant;
    if (!accountant) {
      errors.push({
        path: "profile.details.accountant",
        code: ValidationErrorCode.REQUIRED,
        message: "会計責任者の氏名が入力されていません",
        severity: "error",
      });
    } else {
      if (!accountant.lastName) {
        errors.push({
          path: "profile.details.accountant.lastName",
          code: ValidationErrorCode.REQUIRED,
          message: "会計責任者の姓が入力されていません",
          severity: "error",
        });
      } else if (accountant.lastName.length > 30) {
        errors.push({
          path: "profile.details.accountant.lastName",
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: "会計責任者の姓は30文字以内で入力してください",
          severity: "error",
        });
      }

      if (!accountant.firstName) {
        errors.push({
          path: "profile.details.accountant.firstName",
          code: ValidationErrorCode.REQUIRED,
          message: "会計責任者の名が入力されていません",
          severity: "error",
        });
      } else if (accountant.firstName.length > 30) {
        errors.push({
          path: "profile.details.accountant.firstName",
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: "会計責任者の名は30文字以内で入力してください",
          severity: "error",
        });
      }
    }

    // 活動区域 (KATU_KUKI): 必須、"1" or "2"
    const activityArea = profile.details.activityArea;
    if (!activityArea) {
      errors.push({
        path: "profile.details.activityArea",
        code: ValidationErrorCode.REQUIRED,
        message: "活動区域が選択されていません",
        severity: "error",
      });
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
      errors.push({
        path: "profile.details.dietMemberRelation",
        code: ValidationErrorCode.REQUIRED,
        message: "国会議員関係政治団体の区分が選択されていません",
        severity: "error",
      });
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
  },
} as const;
