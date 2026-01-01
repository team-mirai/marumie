import { CsvFormatError } from "@/server/contexts/report/domain/errors/donor-csv-error";
import type { DonorCsvRecord } from "./donor-csv-record";

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

export class DonorCsvLoader {
  load(csvContent: string): DonorCsvRecord[] {
    if (!csvContent.trim()) {
      return [];
    }

    const lines = csvContent.trim().split("\n");

    if (lines.length === 0) {
      return [];
    }

    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);

    if (headers.length === 0) {
      throw new CsvFormatError("Invalid CSV header: no headers found");
    }

    const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new CsvFormatError(
        `Invalid CSV header: missing required columns: ${missingColumns.join(", ")}`,
      );
    }

    const dataLines = lines.slice(1).filter((line) => line.trim());

    if (dataLines.length > MAX_ROWS) {
      throw new CsvFormatError(`CSVの行数が上限（${MAX_ROWS}行）を超えています`);
    }

    return dataLines.map((line, index) => {
      const values = this.parseCSVLine(line);
      return this.createRecord(headers, values, index + 1);
    });
  }

  private parseCSVLine(line: string): string[] {
    const chars = Array.from(line.replace(/\r$/, ""));

    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (char === '"') {
        if (inQuotes && chars[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
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
