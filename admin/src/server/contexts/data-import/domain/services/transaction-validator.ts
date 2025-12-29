import { PL_CATEGORIES, BS_CATEGORIES } from "@/shared/accounting/account-category";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import type { Transaction } from "@/shared/models/transaction";

const OFFSET_EXPENSE_ACCOUNT = "相殺項目（費用）";
const OFFSET_INCOME_ACCOUNT = "相殺項目（収入）";

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
    const validationErrors: string[] = [];

    // Validate accounts
    const accountValidationErrors = this.validateAccounts(transaction);
    validationErrors.push(...accountValidationErrors);

    // Validate friendly_category
    const categoryValidationError = this.validateFriendlyCategory(transaction);
    if (categoryValidationError) {
      validationErrors.push(categoryValidationError);
    }

    if (validationErrors.length > 0) {
      return {
        ...transaction,
        status: "invalid",
        errors: [...transaction.errors, ...validationErrors],
      };
    }

    // 2. transaction_noチェック（早期リターン）
    const duplicateByTransactionNo = existingTransactions.find(
      (existing) => existing.transaction_no === transaction.transaction_no,
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
    const validAccountLabels = new Set([
      ...Object.keys(PL_CATEGORIES),
      ...Object.keys(BS_CATEGORIES),
      OFFSET_EXPENSE_ACCOUNT,
      OFFSET_INCOME_ACCOUNT,
    ]);

    if (!validAccountLabels.has(transaction.debit_account)) {
      errors.push(`無効な借方科目: "${transaction.debit_account}"`);
    }

    if (!validAccountLabels.has(transaction.credit_account)) {
      errors.push(`無効な貸方科目: "${transaction.credit_account}"`);
    }

    return errors;
  }

  private validateFriendlyCategory(transaction: PreviewTransaction): string | null {
    const isOffsetTransaction =
      transaction.debit_account === OFFSET_EXPENSE_ACCOUNT ||
      transaction.credit_account === OFFSET_INCOME_ACCOUNT;

    const isNonCashTransaction = transaction.transaction_type === "non_cash_journal";

    if (
      !isOffsetTransaction &&
      !isNonCashTransaction &&
      (!transaction.friendly_category || transaction.friendly_category.trim() === "")
    ) {
      return "独自のカテゴリが設定されていません";
    }

    return null;
  }
}
