import type { MfCsvRecord } from "@/server/contexts/data-import/domain/models/mf-csv-record";
import { MfCsvFormatError } from "@/server/contexts/data-import/domain/errors/mf-csv-format-error";
import type { IMfCsvLoader } from "@/server/contexts/data-import/domain/repositories/mf-csv-loader.interface";
import { parseCsv } from "@/server/contexts/shared/infrastructure/csv/parse-csv";

export class MfCsvLoader implements IMfCsvLoader {
  private readonly columnMapping: Record<string, keyof MfCsvRecord> = {
    取引No: "transaction_no",
    取引日: "transaction_date",
    借方勘定科目: "debit_account",
    借方補助科目: "debit_sub_account",
    借方部門: "debit_department",
    借方取引先: "debit_partner",
    借方税区分: "debit_tax_category",
    借方税区: "debit_tax_category", // 実際のMFフォーマット
    借方インボイス: "debit_invoice",
    借方金額: "debit_amount",
    "借方金額(円)": "debit_amount", // 実際のMFフォーマット
    貸方勘定科目: "credit_account",
    貸方補助科目: "credit_sub_account",
    貸方部門: "credit_department",
    貸方取引先: "credit_partner",
    貸方税区分: "credit_tax_category",
    貸方税区: "credit_tax_category", // 実際のMFフォーマット
    貸方インボイス: "credit_invoice",
    貸方金額: "credit_amount",
    "貸方金額(円)": "credit_amount", // 実際のMFフォーマット
    摘要: "description",
    タグ: "friendly_category",
    起訖タグ: "friendly_category", // 実際のMFフォーマット
    メモ: "memo",
  };

  async load(csvContent: string): Promise<MfCsvRecord[]> {
    if (!csvContent.trim()) {
      return [];
    }

    const [headers, ...dataRecords] = parseCsv(csvContent.trim());

    if (!headers || headers.length === 0) {
      throw new MfCsvFormatError("CSV に見出し行がありません。");
    }

    const hasValidHeaders = headers.some((header) => header in this.columnMapping);
    if (!hasValidHeaders) {
      throw new MfCsvFormatError(
        "MFクラウド会計の仕訳帳の形式ではありません。見出し行に「取引No」「取引日」などの列が見つかりませんでした。",
      );
    }

    return dataRecords.map((values) => this.createRecord(headers, values));
  }

  private createRecord(headers: string[], values: string[]): MfCsvRecord {
    const record: Partial<MfCsvRecord> = Object.fromEntries(
      headers
        .map((header, i) => [this.columnMapping[header], values[i] || ""])
        .filter(([key]) => key),
    );

    const defaultRecord: MfCsvRecord = {
      transaction_no: "",
      transaction_date: "",
      debit_account: "",
      debit_sub_account: "",
      debit_department: "",
      debit_partner: "",
      debit_tax_category: "",
      debit_invoice: "",
      debit_amount: "",
      credit_account: "",
      credit_sub_account: "",
      credit_department: "",
      credit_partner: "",
      credit_tax_category: "",
      credit_invoice: "",
      credit_amount: "",
      description: "",
      friendly_category: "",
      memo: "",
    };

    return { ...defaultRecord, ...record };
  }
}
