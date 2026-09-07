import type { MfCsvRecord } from "@/server/contexts/data-import/domain/models/mf-csv-record";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

/** MFクラウドCSVレコード → PreviewTransaction 変換ポート（実装は Infrastructure 層） */
export interface IMfRecordConverter {
  convertRow(record: MfCsvRecord, politicalOrganizationId: string): PreviewTransaction;
}
