import {
  BS_CATEGORIES,
  CASH_ACCOUNTS,
  OFFSET_EXPENSE_ACCOUNT,
  OFFSET_INCOME_ACCOUNT,
  PL_CATEGORIES,
} from "@/shared/accounting/account-category";
import type { TransactionType } from "@/shared/models/transaction";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

/** 仕訳の片側（借方または貸方） */
export interface MfJournalSide {
  account: string;
  subAccount: string | undefined;
  /** 解釈できなかった場合は null */
  amount: number | null;
  /** CSV に書かれていたままの金額（却下理由に使う） */
  rawAmount: string;
}

/** CSV の列をフィールドに対応させ、日付と金額を解釈した後の仕訳 */
export interface MfJournalInput {
  politicalOrganizationId: string;
  transactionNo: string;
  /** 解釈できなかった場合は null */
  transactionDate: Date | null;
  /** CSV に書かれていたままの取引日（却下理由に使う） */
  rawTransactionDate: string;
  debit: MfJournalSide;
  credit: MfJournalSide;
  description: string | undefined;
  label: string | undefined;
  friendlyCategory: string;
}

/** 仕訳の借方・貸方の科目から決まる取引種別とカテゴリ */
interface MfJournalClassification {
  /** 収支として扱えない科目の組み合わせなら null */
  transactionType: TransactionType | null;
  categoryKey: string;
}

/**
 * 解釈できない日付・金額の行の保持値。無効な行は保存されないので、プレビューの表示とハッシュのためだけに使う
 */
const UNPARSED_DATE_PLACEHOLDER = "1970-01-01";
const UNPARSED_AMOUNT_PLACEHOLDER = 0;

const isPL = (account: string): boolean => Object.hasOwn(PL_CATEGORIES, account);
const isBS = (account: string): boolean => Object.hasOwn(BS_CATEGORIES, account);
const isCashEquivalent = (account: string): boolean => CASH_ACCOUNTS.has(account);

function determineCategoryKey(debitAccount: string, creditAccount: string): string {
  if (isPL(debitAccount)) {
    return PL_CATEGORIES[debitAccount]?.key ?? "undefined";
  }
  if (isPL(creditAccount)) {
    return PL_CATEGORIES[creditAccount]?.key ?? "undefined";
  }
  return "undefined";
}

function determineTransactionType(
  debitAccount: string,
  creditAccount: string,
): TransactionType | null {
  if (debitAccount === OFFSET_EXPENSE_ACCOUNT) {
    return "offset_expense";
  }
  if (creditAccount === OFFSET_INCOME_ACCOUNT) {
    return "offset_income";
  }

  const isDebitBS = isBS(debitAccount);
  const isCreditBS = isBS(creditAccount);
  const isDebitPL = isPL(debitAccount);
  const isCreditPL = isPL(creditAccount);

  // 現金収入: 現金類(借方) + PL科目(貸方)
  if (isDebitBS && isCreditPL && isCashEquivalent(debitAccount)) {
    return "income";
  }
  // 現金支出: PL科目(借方) + 現金類(貸方)
  if (isDebitPL && isCreditBS && isCashEquivalent(creditAccount)) {
    return "expense";
  }
  // 発生主義: PL科目が登場した仕訳タイミングで収支を認識（現金を含まない場合）
  if (isDebitPL && isCreditBS) {
    return "expense";
  }
  if (isDebitBS && isCreditPL) {
    return PL_CATEGORIES[creditAccount]?.type === "expense" ? "expense" : "income";
  }
  // BS科目同士の仕訳（未収入金の回収、未払金・未払費用の支払など）は収支ではないが、
  // 貸借対照表の債権・負債残高の集計に必要なため、非現金仕訳として取り込む
  if (isDebitBS && isCreditBS) {
    return "non_cash_journal";
  }

  return null;
}

/**
 * MFクラウドの仕訳を政治資金の取引として分類する会計上のルール
 */
export const MfJournal = {
  /**
   * 借方・貸方の科目から取引種別とカテゴリを決める
   */
  classify: (debitAccount: string, creditAccount: string): MfJournalClassification => ({
    transactionType: determineTransactionType(debitAccount, creditAccount),
    categoryKey: determineCategoryKey(debitAccount, creditAccount),
  }),

  /**
   * 相殺項目を使った仕訳か
   */
  isOffset: (debitAccount: string, creditAccount: string): boolean =>
    debitAccount === OFFSET_EXPENSE_ACCOUNT || creditAccount === OFFSET_INCOME_ACCOUNT,

  /**
   * 取り込める科目か（PL科目・BS科目・相殺項目のいずれか）
   */
  isKnownAccount: (account: string): boolean =>
    isPL(account) ||
    isBS(account) ||
    account === OFFSET_EXPENSE_ACCOUNT ||
    account === OFFSET_INCOME_ACCOUNT,

  /**
   * 仕訳をプレビュー用の取引にする。分類できない科目の組み合わせや、解釈できない日付・金額の行は理由つきで無効にする
   */
  toPreviewTransaction: (input: MfJournalInput): PreviewTransaction => {
    const { transactionType, categoryKey } = MfJournal.classify(
      input.debit.account,
      input.credit.account,
    );

    const errors: string[] = [];
    if (transactionType === null) {
      errors.push(
        `Invalid account combination: debit=${input.debit.account}, credit=${input.credit.account}`,
      );
    }
    if (input.transactionDate === null) {
      errors.push(`Invalid date format: ${input.rawTransactionDate}`);
    }
    if (input.debit.amount === null) {
      errors.push(`借方金額を解釈できません: "${input.debit.rawAmount}"`);
    }
    if (input.credit.amount === null) {
      errors.push(`貸方金額を解釈できません: "${input.credit.rawAmount}"`);
    }

    const transaction: PreviewTransaction = {
      political_organization_id: input.politicalOrganizationId,
      transaction_no: input.transactionNo,
      transaction_date: input.transactionDate ?? new Date(UNPARSED_DATE_PLACEHOLDER),
      transaction_type: transactionType,
      debit_account: input.debit.account,
      debit_sub_account: input.debit.subAccount,
      debit_amount: input.debit.amount ?? UNPARSED_AMOUNT_PLACEHOLDER,
      credit_account: input.credit.account,
      credit_sub_account: input.credit.subAccount,
      credit_amount: input.credit.amount ?? UNPARSED_AMOUNT_PLACEHOLDER,
      description: input.description,
      label: input.label,
      friendly_category: input.friendlyCategory,
      category_key: categoryKey,
      hash: "",
      status: errors.length > 0 ? "invalid" : "insert",
      errors,
    };
    transaction.hash = PreviewTransaction.generateHash(transaction);

    return transaction;
  },

  /**
   * ブラウザから送り返されたプレビューの行を、仕訳の内容だけから組み立て直す。
   * 状態・取引種別・カテゴリ・ハッシュ・団体は送られてきた値を信じず、科目から分類し直して計算し直す。
   * 新規・更新・変更なしの判定は、既存の取引と照合する TransactionValidator で行い直す
   */
  fromReturnedPreview: (
    returned: PreviewTransaction,
    politicalOrganizationId: string,
  ): PreviewTransaction =>
    MfJournal.toPreviewTransaction({
      politicalOrganizationId,
      transactionNo: returned.transaction_no,
      transactionDate: toValidDate(returned.transaction_date),
      rawTransactionDate: String(returned.transaction_date),
      debit: {
        account: returned.debit_account,
        subAccount: returned.debit_sub_account,
        amount: toValidAmount(returned.debit_amount),
        rawAmount: String(returned.debit_amount),
      },
      credit: {
        account: returned.credit_account,
        subAccount: returned.credit_sub_account,
        amount: toValidAmount(returned.credit_amount),
        rawAmount: String(returned.credit_amount),
      },
      description: returned.description,
      label: returned.label,
      friendlyCategory: returned.friendly_category,
    }),
} as const;

function toValidDate(value: unknown): Date | null {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toValidAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}
