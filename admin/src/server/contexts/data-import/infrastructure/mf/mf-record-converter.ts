import type { MfCsvRecord } from "@/server/contexts/data-import/infrastructure/mf/mf-csv-loader";
import {
  PL_CATEGORIES,
  BS_CATEGORIES,
  CASH_ACCOUNTS,
} from "@/shared/utils/category-mapping";
import type { TransactionType } from "@/shared/models/transaction";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

export class MfRecordConverter {
  public convertRow(
    record: MfCsvRecord,
    politicalOrganizationId: string,
  ): PreviewTransaction {
    const debitAmount = this.parseAmount(record.debit_amount);
    const creditAmount = this.parseAmount(record.credit_amount);
    const categoryKey = this.determineCategoryKey(
      record.debit_account,
      record.credit_account,
    );
    const transactionType = this.determineTransactionType(
      record.debit_account,
      record.credit_account,
    );

    const friendlyCategory = record.friendly_category;

    const label = this.shouldDisplayDescription(record)
      ? record.description
      : undefined;

    // Determine status and errors based on conversion
    let status: "insert" | "update" | "invalid" | "skip" = "insert";
    let errors: string[] = [];

    if (transactionType === null) {
      status = "invalid";
      errors = [
        `Invalid account combination: debit=${record.debit_account}, credit=${record.credit_account}`,
      ];
    }

    // Parse transaction date with validation
    const { date: transactionDate, isValid: isDateValid } =
      this.parseTransactionDate(record.transaction_date);
    if (!isDateValid) {
      status = "invalid";
      errors.push(`Invalid date format: ${record.transaction_date}`);
    }

    const transaction = {
      political_organization_id: politicalOrganizationId,
      transaction_no: record.transaction_no,
      transaction_date: transactionDate,
      transaction_type: transactionType,
      debit_account: record.debit_account,
      debit_sub_account: record.debit_sub_account,
      debit_amount: debitAmount,
      credit_account: record.credit_account,
      credit_sub_account: record.credit_sub_account,
      credit_amount: creditAmount,
      description: record.description,
      label: label,
      friendly_category: friendlyCategory,
      category_key: categoryKey,
      hash: "",
      status,
      errors,
    };

    // hash値を計算して設定
    transaction.hash = PreviewTransaction.generateHash(transaction);

    return transaction;
  }

  private parseTransactionDate(dateStr: string): {
    date: Date;
    isValid: boolean;
  } {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return { date: new Date("1970-01-01"), isValid: false };
      }
      return { date, isValid: true };
    } catch (_error) {
      return { date: new Date("1970-01-01"), isValid: false };
    }
  }

  private shouldDisplayDescription(record: MfCsvRecord): boolean {
    const description = record.description ?? "";
    const memo = record.memo ?? "";

    const normalizedDescription = description.toLowerCase();
    const normalizedMemo = memo.toLowerCase();

    const descriptionStartsWithDebit = description.startsWith("デビット");
    const containsUpsider =
      normalizedDescription.includes("upsider") ||
      normalizedMemo.includes("upsider");
    const containsAmex =
      normalizedDescription.includes("amex") || normalizedMemo.includes("amex");

    return Boolean(
      descriptionStartsWithDebit || containsUpsider || containsAmex,
    );
  }

  private parseAmount(amountStr: string): number {
    if (!amountStr || amountStr.trim() === "") {
      return 0;
    }

    const cleaned = amountStr.replace(/[,\s]/g, "");
    const parsed = parseInt(cleaned, 10);

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private determineCategoryKey(
    debitAccount: string,
    creditAccount: string,
  ): string {
    const isDebitPL = debitAccount in PL_CATEGORIES;
    const isCreditPL = creditAccount in PL_CATEGORIES;

    if (isDebitPL) {
      const mapping = PL_CATEGORIES[debitAccount];
      return mapping ? mapping.key : "undefined";
    }
    if (isCreditPL) {
      const mapping = PL_CATEGORIES[creditAccount];
      return mapping ? mapping.key : "undefined";
    }
    return "undefined";
  }

  private determineTransactionType(
    debitAccount: string,
    creditAccount: string,
  ): TransactionType | null {
    if (debitAccount === "相殺項目（費用）") {
      return "offset_expense";
    }
    if (creditAccount === "相殺項目（収入）") {
      return "offset_income";
    }

    const isDebitBS = debitAccount in BS_CATEGORIES;
    const isCreditBS = creditAccount in BS_CATEGORIES;
    const isDebitPL = debitAccount in PL_CATEGORIES;
    const isCreditPL = creditAccount in PL_CATEGORIES;

    // 現金収入: 現金類(借方) + PL科目(貸方)
    if (isDebitBS && isCreditPL && this.isCashEquivalent(debitAccount)) {
      return "income";
    }
    // 現金支出: PL科目(借方) + 現金類(貸方)
    if (isDebitPL && isCreditBS && this.isCashEquivalent(creditAccount)) {
      return "expense";
    }
    // 非現金仕訳: PL科目とBS科目の組み合わせ（現金を含まない）
    if ((isDebitPL && isCreditBS) || (isDebitBS && isCreditPL)) {
      return "non_cash_journal";
    }

    return null;
  }

  private isCashEquivalent(account: string): boolean {
    return CASH_ACCOUNTS.has(account);
  }
}
