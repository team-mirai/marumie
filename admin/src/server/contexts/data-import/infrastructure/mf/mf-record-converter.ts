import type { MfCsvRecord } from "@/server/contexts/data-import/domain/models/mf-csv-record";
import type { IMfRecordConverter } from "@/server/contexts/data-import/domain/repositories/mf-record-converter.interface";
import { MfJournal } from "@/server/contexts/data-import/domain/models/mf-journal";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

/**
 * MFクラウドCSVの行を仕訳のフィールドに対応させ、日付・金額の文字列を解釈する。
 * 取引種別・カテゴリの分類と無効な行の判定はドメイン（MfJournal）が行う
 */
export class MfRecordConverter implements IMfRecordConverter {
  public convertRow(record: MfCsvRecord, politicalOrganizationId: string): PreviewTransaction {
    return MfJournal.toPreviewTransaction({
      politicalOrganizationId,
      transactionNo: record.transaction_no,
      transactionDate: this.parseTransactionDate(record.transaction_date),
      rawTransactionDate: record.transaction_date,
      debit: {
        account: record.debit_account,
        subAccount: record.debit_sub_account,
        amount: this.parseAmount(record.debit_amount),
        rawAmount: record.debit_amount,
      },
      credit: {
        account: record.credit_account,
        subAccount: record.credit_sub_account,
        amount: this.parseAmount(record.credit_amount),
        rawAmount: record.credit_amount,
      },
      description: record.description,
      label: this.shouldDisplayDescription(record) ? record.description : undefined,
      friendlyCategory: record.friendly_category,
    });
  }

  private parseTransactionDate(dateStr: string): Date | null {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private shouldDisplayDescription(record: MfCsvRecord): boolean {
    const description = record.description ?? "";
    const memo = record.memo ?? "";

    const normalizedDescription = description.toLowerCase();
    const normalizedMemo = memo.toLowerCase();

    const descriptionStartsWithDebit = description.startsWith("デビット");
    const containsUpsider =
      normalizedDescription.includes("upsider") || normalizedMemo.includes("upsider");
    const containsAmex = normalizedDescription.includes("amex") || normalizedMemo.includes("amex");

    return Boolean(descriptionStartsWithDebit || containsUpsider || containsAmex);
  }

  private parseAmount(amountStr: string | undefined): number | null {
    const cleaned = (amountStr ?? "").replace(/[,\s]/g, "");
    if (!/^-?\d+$/.test(cleaned)) {
      return null;
    }
    return parseInt(cleaned, 10);
  }
}
