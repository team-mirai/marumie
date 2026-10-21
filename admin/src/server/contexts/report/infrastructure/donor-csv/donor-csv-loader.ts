import "server-only";

import { CsvFormatError } from "@/server/contexts/report/domain/errors/donor-csv-error";
import type { DonorCsvRecord } from "@/server/contexts/report/domain/models/donor-csv-record";
import type { IDonorCsvLoader } from "@/server/contexts/report/domain/repositories/donor-csv-loader.interface";
import { parseCsv } from "@/server/contexts/shared/infrastructure/csv/parse-csv";

const MAX_ROWS = 1000;

/**
 * 日本語ヘッダーから英語カラム名へのマッピング
 */
const COLUMN_MAPPING: Record<string, keyof Omit<DonorCsvRecord, "rowNumber">> = {
  取引No: "transaction_no",
  寄付者名: "name",
  寄付者種別: "donorType",
  住所: "address",
  職業: "occupation",
};

const REQUIRED_COLUMNS = ["取引No", "寄付者名", "寄付者種別", "住所", "職業"];

export class DonorCsvLoader implements IDonorCsvLoader {
  load(csvContent: string): DonorCsvRecord[] {
    if (!csvContent.trim()) {
      return [];
    }

    const [headers, ...dataRecords] = parseCsv(csvContent.trim());

    if (!headers || headers.length === 0) {
      throw new CsvFormatError("Invalid CSV header: no headers found");
    }

    const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new CsvFormatError(
        `Invalid CSV header: missing required columns: ${missingColumns.join(", ")}`,
      );
    }

    if (dataRecords.length > MAX_ROWS) {
      throw new CsvFormatError(`CSVの行数が上限（${MAX_ROWS}行）を超えています`);
    }

    return dataRecords.map((values, index) => this.createRecord(headers, values, index + 1));
  }

  private createRecord(headers: string[], values: string[], rowNumber: number): DonorCsvRecord {
    const record: Partial<Omit<DonorCsvRecord, "rowNumber">> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const mappedKey = COLUMN_MAPPING[header];
      if (mappedKey) {
        record[mappedKey] = values[i] || "";
      }
    }

    return {
      rowNumber,
      transaction_no: record.transaction_no || "",
      name: record.name || "",
      donorType: record.donorType || "",
      address: record.address || "",
      occupation: record.occupation || "",
    };
  }
}
