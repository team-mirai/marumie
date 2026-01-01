import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";

export interface PreviewDonorCsvSummary {
  /** 全件数 */
  total: number;
  /** 正常件数（インポート可能） */
  valid: number;
  /** 入力値エラー件数 */
  invalid: number;
  /** Transaction 未存在件数 */
  transactionNotFound: number;
  /** 種別不整合件数 */
  typeMismatch: number;
}

export function calculateDonorPreviewSummary(rows: PreviewDonorCsvRow[]): PreviewDonorCsvSummary {
  return {
    total: rows.length,
    valid: rows.filter((row) => row.status === "valid").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
    transactionNotFound: rows.filter((row) => row.status === "transaction_not_found").length,
    typeMismatch: rows.filter((row) => row.status === "type_mismatch").length,
  };
}
