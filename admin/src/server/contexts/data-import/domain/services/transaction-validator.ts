import { MfJournal } from "@/server/contexts/data-import/domain/models/mf-journal";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import type { Transaction } from "@/shared/models/transaction";

export class TransactionValidator {
  public validatePreviewTransactions(
    transactions: PreviewTransaction[],
    existingTransactions: Transaction[] = [],
  ): PreviewTransaction[] {
    return transactions.map((transaction) =>
      this.validateSingleTransaction(transaction, existingTransactions),
    );
  }

  private validateSingleTransaction(
    transaction: PreviewTransaction,
    existingTransactions: Transaction[],
  ): PreviewTransaction {
    // 1. validチェック（早期リターン）
    // 変換時に分かった無効の理由（分類できない科目の組み合わせ、解釈できない日付・金額）は引き継ぐ
    const conversionErrors = transaction.status === "invalid" ? transaction.errors : [];
    const validationErrors: string[] = [];

    // Validate accounts
    const accountValidationErrors = this.validateAccounts(transaction);
    validationErrors.push(...accountValidationErrors);

    // Validate friendly_category
    const categoryValidationError = this.validateFriendlyCategory(transaction);
    if (categoryValidationError) {
      validationErrors.push(categoryValidationError);
    }

    if (conversionErrors.length > 0 || validationErrors.length > 0) {
      return {
        ...transaction,
        status: "invalid",
        errors: [...conversionErrors, ...validationErrors],
      };
    }

    // 2. transaction_noチェック（早期リターン）
    // MF の取引No は年度ごとに振り直されるため、同じ年度の取引だけを同一とみなす
    const financialYear = PreviewTransaction.extractFinancialYear(transaction.transaction_date);
    const duplicateByTransactionNo = existingTransactions.find(
      (existing) =>
        existing.transaction_no === transaction.transaction_no &&
        existing.financial_year === financialYear,
    );

    if (!duplicateByTransactionNo) {
      // transaction_noが存在しなければinsertに確定
      return {
        ...transaction,
        status: "insert",
        errors: [],
      };
    }

    // 3. hash同一性チェック（同じtransaction_noのトランザクションとhashを比較）
    if (duplicateByTransactionNo.hash === transaction.hash) {
      return {
        ...transaction,
        status: "skip",
        errors: ["重複のためスキップされます"],
      };
    }

    // transaction_noは存在するがhashが異なる場合はupdate
    return {
      ...transaction,
      status: "update",
      errors: [],
      existingTransactionId: duplicateByTransactionNo.id,
    };
  }

  private validateAccounts(transaction: PreviewTransaction): string[] {
    const errors: string[] = [];

    if (!MfJournal.isKnownAccount(transaction.debit_account)) {
      errors.push(`無効な借方科目: "${transaction.debit_account}"`);
    }

    if (!MfJournal.isKnownAccount(transaction.credit_account)) {
      errors.push(`無効な貸方科目: "${transaction.credit_account}"`);
    }

    return errors;
  }

  private validateFriendlyCategory(transaction: PreviewTransaction): string | null {
    const isOffsetTransaction = MfJournal.isOffset(
      transaction.debit_account,
      transaction.credit_account,
    );
    // 非現金仕訳（BS科目同士の仕訳）は収支として表示されないため、独自のカテゴリを必須にしない
    const isNonCashJournal = transaction.transaction_type === "non_cash_journal";

    if (
      !isOffsetTransaction &&
      !isNonCashJournal &&
      (!transaction.friendly_category || transaction.friendly_category.trim() === "")
    ) {
      return "独自のカテゴリが設定されていません";
    }

    return null;
  }
}
