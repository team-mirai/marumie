export interface MfCsvRecord {
  transaction_no: string;
  transaction_date: string;
  debit_account: string;
  debit_sub_account: string;
  debit_department: string;
  debit_partner: string;
  debit_tax_category: string;
  debit_invoice: string;
  debit_amount: string;
  credit_account: string;
  credit_sub_account: string;
  credit_department: string;
  credit_partner: string;
  credit_tax_category: string;
  credit_invoice: string;
  credit_amount: string;
  description: string;
  friendly_category: string;
  memo: string;
}

export class MfCsvLoader {
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

    const lines = csvContent.trim().split("\n");

    if (lines.length === 0) {
      return [];
    }

    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);

    if (headers.length === 0) {
      throw new Error("Invalid CSV format: no headers found");
    }

    const hasValidHeaders = headers.some((header) => header in this.columnMapping);
    if (!hasValidHeaders) {
      throw new Error("Invalid CSV format: no recognized headers found");
    }

    const dataLines = lines.slice(1);

    return dataLines
      .filter((line) => line.trim())
      .map((line) => {
        try {
          const values = this.parseCSVLine(line);
          return this.createRecord(headers, values);
        } catch (_error) {
          throw new Error(`Failed to parse CSV line: ${line}`);
        }
      });
  }

  private parseCSVLine(line: string): string[] {
    const chars = Array.from(line);

    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of chars) {
      if (char === '"') {
        inQuotes = !inQuotes;
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
