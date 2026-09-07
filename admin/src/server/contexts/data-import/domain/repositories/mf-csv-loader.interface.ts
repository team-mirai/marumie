import type { MfCsvRecord } from "@/server/contexts/data-import/domain/models/mf-csv-record";

/** MFクラウドCSVの読み込みポート（実装は Infrastructure 層） */
export interface IMfCsvLoader {
  load(csvContent: string): Promise<MfCsvRecord[]>;
}
