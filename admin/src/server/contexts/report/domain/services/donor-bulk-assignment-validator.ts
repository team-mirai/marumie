/**
 * 複数取引への一括Donor紐付け時の整合性チェックを担当するドメインサービス
 */

import type { DonorType, Donor } from "@/server/contexts/report/domain/models/donor";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import {
  isDonorRequired,
  getCommonAllowedDonorTypes,
  isDonorTypeAllowedForCategory,
} from "@/server/contexts/report/domain/models/donor-assignment-rules";

export type BulkAssignmentValidationErrorType = "incompatible_categories" | "donor_type_mismatch";

export interface BulkAssignmentValidationError {
  type: BulkAssignmentValidationErrorType;
  message: string;
  details: {
    transactionIds?: string[];
    categoryKeys?: string[];
    donorType?: DonorType;
  };
}

export interface BulkAssignmentValidationResult {
  isValid: boolean;
  allowedDonorTypes: DonorType[];
  errors: BulkAssignmentValidationError[];
}

/**
 * 複数取引への一括Donor紐付け時の整合性チェックを行うドメインサービス
 */
export class DonorBulkAssignmentValidator {
  /**
   * 複数取引のカテゴリ整合性をチェックし、許可されるdonor_typeを算出
   *
   * @param transactions - 紐付け対象の取引一覧
   * @returns バリデーション結果
   */
  validateCategoryCompatibility(
    transactions: TransactionWithDonor[],
  ): BulkAssignmentValidationResult {
    if (transactions.length === 0) {
      return {
        isValid: false,
        allowedDonorTypes: [],
        errors: [
          {
            type: "incompatible_categories",
            message: "取引が選択されていません",
            details: {},
          },
        ],
      };
    }

    // Donor紐付け対象外の取引をチェック
    const nonDonorRequiredTransactions = transactions.filter(
      (t) => !isDonorRequired(t.categoryKey),
    );
    if (nonDonorRequiredTransactions.length > 0) {
      return {
        isValid: false,
        allowedDonorTypes: [],
        errors: [
          {
            type: "incompatible_categories",
            message: "Donor紐付け対象外のカテゴリが含まれています",
            details: {
              transactionIds: nonDonorRequiredTransactions.map((t) => t.id),
              categoryKeys: [...new Set(nonDonorRequiredTransactions.map((t) => t.categoryKey))],
            },
          },
        ],
      };
    }

    // 全取引のカテゴリから共通して許可されるdonor_typeを算出
    const categoryKeys = transactions.map((t) => t.categoryKey);
    const allowedDonorTypes = getCommonAllowedDonorTypes(categoryKeys);

    if (allowedDonorTypes.length === 0) {
      // 共通して許可されるdonor_typeがない場合
      const uniqueCategoryKeys = [...new Set(categoryKeys)];
      return {
        isValid: false,
        allowedDonorTypes: [],
        errors: [
          {
            type: "incompatible_categories",
            message:
              "選択された取引のカテゴリに共通して許可される寄付者種別がありません。異なる種別の寄附カテゴリが混在しています。",
            details: {
              transactionIds: transactions.map((t) => t.id),
              categoryKeys: uniqueCategoryKeys,
            },
          },
        ],
      };
    }

    return {
      isValid: true,
      allowedDonorTypes,
      errors: [],
    };
  }

  /**
   * 指定されたDonorが全取引に紐付け可能かをチェック
   *
   * @param transactions - 紐付け対象の取引一覧
   * @param donor - 紐付けるDonor
   * @returns バリデーション結果
   */
  validateDonorAssignment(
    transactions: TransactionWithDonor[],
    donor: Donor,
  ): BulkAssignmentValidationResult {
    // まずカテゴリ整合性をチェック
    const categoryResult = this.validateCategoryCompatibility(transactions);
    if (!categoryResult.isValid) {
      return categoryResult;
    }

    // Donorのdonor_typeが許可されているかチェック
    if (!categoryResult.allowedDonorTypes.includes(donor.donorType)) {
      // どの取引でdonor_typeが許可されていないかを特定
      const incompatibleTransactions = transactions.filter(
        (t) => !isDonorTypeAllowedForCategory(t.categoryKey, donor.donorType),
      );

      return {
        isValid: false,
        allowedDonorTypes: categoryResult.allowedDonorTypes,
        errors: [
          {
            type: "donor_type_mismatch",
            message: `選択された寄付者の種別（${donor.donorType}）は、一部の取引カテゴリで許可されていません`,
            details: {
              transactionIds: incompatibleTransactions.map((t) => t.id),
              categoryKeys: [...new Set(incompatibleTransactions.map((t) => t.categoryKey))],
              donorType: donor.donorType,
            },
          },
        ],
      };
    }

    return {
      isValid: true,
      allowedDonorTypes: categoryResult.allowedDonorTypes,
      errors: [],
    };
  }
}
