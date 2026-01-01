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
  const summary = {
    total: rows.length,
    valid: 0,
    invalid: 0,
    transactionNotFound: 0,
    typeMismatch: 0,
  };

  for (const row of rows) {
    switch (row.status) {
      case "valid":
        summary.valid++;
        break;
      case "invalid":
        summary.invalid++;
        break;
      case "transaction_not_found":
        summary.transactionNotFound++;
        break;
      case "type_mismatch":
        summary.typeMismatch++;
        break;
    }
  }

  return summary;
}
