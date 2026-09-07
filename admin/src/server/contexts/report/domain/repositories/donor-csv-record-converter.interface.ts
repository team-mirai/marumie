import type { DonorCsvRecord } from "@/server/contexts/report/domain/models/donor-csv-record";
import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";

/** 寄附者CSVレコード → PreviewDonorCsvRow 変換ポート（実装は Infrastructure 層） */
export interface IDonorCsvRecordConverter {
  convert(record: DonorCsvRecord): PreviewDonorCsvRow;
}
