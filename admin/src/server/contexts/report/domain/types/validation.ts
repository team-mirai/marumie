/**
 * Validation Types
 *
 * Type definitions for validation results used across domain models.
 */

/**
 * バリデーションエラー
 */
export interface ValidationError {
  path: string; // エラー箇所のパス（例: "profile.officialName"）
  code: string; // エラーコード（例: "REQUIRED", "INVALID_FORMAT"）
  message: string; // 日本語メッセージ
  severity: "error" | "warning";
}

/**
 * バリデーション結果
 *
 * - error: XMLとして出力できない致命的な問題
 * - warning: 出力は可能だが確認が必要な問題（例: 未分類の取引がある）
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * バリデーションエラーコード
 */
export const ValidationErrorCode = {
  REQUIRED: "REQUIRED",
  INVALID_FORMAT: "INVALID_FORMAT",
  MAX_LENGTH_EXCEEDED: "MAX_LENGTH_EXCEEDED",
  INVALID_VALUE: "INVALID_VALUE",
  NEGATIVE_VALUE: "NEGATIVE_VALUE",
  CONSISTENCY_ERROR: "CONSISTENCY_ERROR",
  SUMMARY_MISMATCH: "SUMMARY_MISMATCH",
} as const;

export type ValidationErrorCodeType =
  (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];
