import type { DonorCsvRecord } from "@/server/contexts/report/domain/models/donor-csv-record";

/** 寄附者CSVの読み込みポート（実装は Infrastructure 層） */
export interface IDonorCsvLoader {
  load(csvContent: string): DonorCsvRecord[];
}
