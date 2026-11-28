import type { Transaction } from "@/shared/models/transaction";
import {
  LOAN_ACCOUNT,
  PL_CATEGORIES,
  type CategoryMapping,
} from "@/shared/accounting/account-category";

/**
 * DisplayTransaction ドメインモデル
 *
 * 表示用取引データを表現する。
 * Transaction から DisplayTransaction への変換ロジックを純粋関数として提供する。
 */

/**
 * 表示用取引タイプ（offset系は除外）
 */
export type DisplayTransactionType = "income" | "expense";

/**
 * 表示用取引データ
 */
export interface DisplayTransaction {
  id: string;
  date: Date;
  yearmonth: string;
  transactionType: DisplayTransactionType;
  /**
   * 収支科目が通常と逆の側にある仕訳なら true。一覧では「返金・取消」と表示する。
   * 返金のほか、キャンセルや記帳の訂正も同じ形の仕訳になり、科目だけでは区別できない
   */
  isReversal: boolean;
  category: string;
  subcategory?: string;
  account: string;
  /** 保存済みの category_key。カテゴリーの絞り込みはサーバーがこの値で照合する */
  categoryKey: string;
  label: string;
  shortLabel: string;
  friendly_category: string;
  absAmount: number;
  amount: number;
}

/**
 * 年月フォーマット文字列を生成する
 * @param date 日付
 * @returns "YYYY.MM" 形式の文字列
 */
export function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

/**
 * アカウント名からカテゴリマッピングを取得する
 * 存在しない場合はデフォルト値を返す
 * @param account アカウント名
 * @returns カテゴリマッピング
 */
export function getCategoryMapping(account: string): CategoryMapping {
  return (
    PL_CATEGORIES[account] || {
      category: "unknown",
      subcategory: "unknown",
      color: "#99F6E4",
      shortLabel: "不明",
    }
  );
}

/**
 * 仕訳を収支として読んだ結果
 */
interface CashFlowReading {
  /** 収入・支出のどちらに属するか。保存済みの transaction_type ではなく、収支科目の種類から決める */
  transactionType: DisplayTransactionType;
  /** 収支科目（表示するカテゴリーの元になる勘定科目） */
  account: string;
  /** 収支科目が通常と逆の側にある仕訳（返金・取り消し）なら true */
  isReversal: boolean;
  /**
   * その種別の合計に効く金額。発生ならプラス、戻しならマイナス
   * （支出 1,000 円は 1000、その返金 300 円は -300。支出の正味は合計の 700）
   */
  netAmount: number;
}

/**
 * 仕訳を収支として読む
 *
 * 原則: 収入か支出かは収支科目（PL科目）の種類が決め、借方・貸方のどちらにあるかは
 * 発生か戻しかだけを決める。相手科目（普通預金か仮払金かなど）は判定に使わない。
 *
 * | 収支科目 | 位置 | 意味                         | 種別    | netAmount |
 * | -------- | ---- | ---------------------------- | ------- | --------- |
 * | 支出科目 | 借方 | 支出の発生                   | expense | プラス    |
 * | 支出科目 | 貸方 | 支出の戻し（返金・取り消し） | expense | マイナス  |
 * | 収入科目 | 貸方 | 収入の発生                   | income  | プラス    |
 * | 収入科目 | 借方 | 収入の戻し（寄附の返金など） | income  | マイナス  |
 *
 * 例外は借入金だけで、借方に来た借入金は収入の戻しではなく返済なので支出の発生として読む
 * （LOAN_ACCOUNT の定義、および集計側の buildNetCategoryAggregation と同じ扱い）。
 *
 * 返金を収入に数えないのは、費用科目の貸方記入が収益の発生ではなく費用の取り消しだからで、
 * 収入に数えると収入と支出の総額がどちらも実態より大きく見える。
 */
export function readTransactionAsCashFlow(transaction: Transaction): CashFlowReading {
  const debitType = plTypeOf(transaction.debit_account);
  const creditType = plTypeOf(transaction.credit_account);

  if (debitType === "expense" || transaction.debit_account === LOAN_ACCOUNT) {
    return occurrence("expense", transaction.debit_account, transaction.debit_amount);
  }
  if (debitType === "income") {
    return reversal("income", transaction.debit_account, transaction.debit_amount);
  }
  if (creditType === "income") {
    return occurrence("income", transaction.credit_account, transaction.credit_amount);
  }
  if (creditType === "expense") {
    return reversal("expense", transaction.credit_account, transaction.credit_amount);
  }

  // 収支科目がどちらの側にも無い仕訳（科目マスタに無い科目など）は、保存済みの種別のとおりに読む
  return transaction.transaction_type === "expense"
    ? occurrence("expense", transaction.debit_account, transaction.debit_amount)
    : occurrence("income", transaction.credit_account, transaction.credit_amount);
}

function plTypeOf(account: string): DisplayTransactionType | undefined {
  return Object.hasOwn(PL_CATEGORIES, account) ? PL_CATEGORIES[account].type : undefined;
}

function occurrence(
  transactionType: DisplayTransactionType,
  account: string,
  amount: number,
): CashFlowReading {
  return { transactionType, account, isReversal: false, netAmount: Math.abs(amount) };
}

function reversal(
  transactionType: DisplayTransactionType,
  account: string,
  amount: number,
): CashFlowReading {
  return { transactionType, account, isReversal: true, netAmount: -Math.abs(amount) };
}

/**
 * 表示用金額を計算する
 * @param transaction トランザクション
 * @returns absAmount（絶対値）と amount（お金が出ていく向きがマイナス、入ってくる向きがプラス）
 */
export function calculateDisplayAmount(transaction: Transaction): {
  absAmount: number;
  amount: number;
} {
  const { transactionType, netAmount } = readTransactionAsCashFlow(transaction);

  const absAmount = Math.abs(netAmount);
  // 支出の発生はマイナス、支出の戻し（返金）はプラス。収入はその逆
  // （0 を -0 にしないよう、符号の反転は 0 以外に限る）
  const amount = transactionType === "expense" && netAmount !== 0 ? -netAmount : netAmount;

  return { absAmount, amount };
}

/**
 * Transaction を DisplayTransaction に変換する
 * @param transaction 元のTransactionオブジェクト
 * @returns 表示用に変換されたDisplayTransactionオブジェクト
 */
export function convertToDisplayTransaction(transaction: Transaction): DisplayTransaction {
  // offset系のトランザクションタイプが渡された場合は警告を出力
  if (
    transaction.transaction_type === "offset_income" ||
    transaction.transaction_type === "offset_expense"
  ) {
    console.warn(
      `offset（相殺取引）を直接表示することは想定されていません。データ取得方法が間違っていないか確認しましょう。transaction_type: ${transaction.transaction_type}, transaction ID: ${transaction.id}`,
    );
  }

  const yearmonth = formatYearMonth(new Date(transaction.transaction_date));
  const { transactionType, account, isReversal } = readTransactionAsCashFlow(transaction);
  const categoryMapping = getCategoryMapping(account);
  const { absAmount, amount } = calculateDisplayAmount(transaction);

  return {
    id: transaction.id,
    date: transaction.transaction_date,
    yearmonth,
    transactionType,
    isReversal,
    category: categoryMapping.category,
    subcategory: categoryMapping.subcategory,
    account,
    categoryKey: transaction.category_key,
    label: transaction.label || "",
    shortLabel: categoryMapping.shortLabel,
    friendly_category: transaction.friendly_category,
    absAmount,
    amount,
  };
}

/**
 * Transaction配列をDisplayTransaction配列に変換する
 * @param transactions トランザクション配列
 * @returns 表示用に変換されたDisplayTransaction配列
 */
export function convertToDisplayTransactions(transactions: Transaction[]): DisplayTransaction[] {
  return transactions.map(convertToDisplayTransaction);
}
