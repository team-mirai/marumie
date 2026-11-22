/**
 * 政治資金報告書におけるCounterpart紐づけルールを定義するドメインモデル
 *
 * このファイルは報告書の仕様（docs/reference/report-format.md）に基づき、
 * どのトランザクションがCounterpart情報を必要とするかを定義します。
 */

import { PL_CATEGORIES } from "@/shared/accounting/account-category";
import {
  type RawExpenseAmountCondition,
  getExpenseDetailRawAmountConditions,
  isExpenseDetailRequired,
} from "@/server/contexts/report/domain/models/expense-detail-threshold";

/**
 * Counterpart紐づけが必要な収入カテゴリ
 * - loans: 借入金（SYUUSHI07_04）
 * - grants: 本部・支部交付金（SYUUSHI07_05）
 *
 * ※ キーは shared/accounting/account-category.ts の PL_CATEGORIES.key と一致させる
 */
export const COUNTERPART_REQUIRED_INCOME_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["借入金"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key,
] as const;

/**
 * 経常経費カテゴリ（SYUUSHI07_14）
 */
export const ROUTINE_EXPENSE_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["光熱水費"].key,
  PL_CATEGORIES["備品・消耗品費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["事務所費"].key,
] as const;

/**
 * 政治活動費カテゴリ（SYUUSHI07_15）
 */
export const POLITICAL_ACTIVITY_EXPENSE_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["組織活動費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["選挙関係費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["機関紙誌の発行事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["宣伝事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["政治資金パーティー開催事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["その他の事業費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["調査研究費"].key,
  PL_CATEGORIES["寄附・交付金"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["その他の経費"].key,
] as const;

/**
 * Counterpart紐づけが必要な支出カテゴリ
 * 経常経費（SYUUSHI07_14）と政治活動費（SYUUSHI07_15）のすべて
 *
 * ※ キーは shared/accounting/account-category.ts の PL_CATEGORIES.key と一致させる
 */
export const COUNTERPART_REQUIRED_EXPENSE_CATEGORIES = [
  ...ROUTINE_EXPENSE_CATEGORIES,
  ...POLITICAL_ACTIVITY_EXPENSE_CATEGORIES,
] as const;

type CounterpartRequiredIncomeCategory = (typeof COUNTERPART_REQUIRED_INCOME_CATEGORIES)[number];

type CounterpartRequiredExpenseCategory = (typeof COUNTERPART_REQUIRED_EXPENSE_CATEGORIES)[number];

/**
 * トランザクションがCounterpart紐づけ対象かどうかを判定
 *
 * @param transactionType - 'income' | 'expense'
 * @param categoryKey - カテゴリキー（例: 'expense_office_expenses'）
 * @returns Counterpart紐づけ対象の場合true
 *
 * @example
 * ```typescript
 * isCounterpartRequired('expense', 'expense_office_expenses') // true
 * isCounterpartRequired('income', 'income_donation_individual') // false（寄附は対象外）
 * ```
 */
export function isCounterpartRequired(
  transactionType: "income" | "expense",
  categoryKey: string,
): boolean {
  if (transactionType === "income") {
    return COUNTERPART_REQUIRED_INCOME_CATEGORIES.includes(
      categoryKey as CounterpartRequiredIncomeCategory,
    );
  }
  if (transactionType === "expense") {
    return COUNTERPART_REQUIRED_EXPENSE_CATEGORIES.includes(
      categoryKey as CounterpartRequiredExpenseCategory,
    );
  }
  return false;
}

/**
 * Counterpart明細記載が必要なトランザクションかどうかを総合判定
 *
 * 以下の条件をすべて満たす場合にtrue:
 * 1. カテゴリがCounterpart紐づけ対象である
 * 2. 支出の場合、金額が明細記載の基準以上である（収入の借入金・交付金は金額を問わずすべて記載）
 *
 * 支出の金額は報告書の明細行と同じ求め方（resolveExpenseDetailAmount）で判定する。
 *
 * @param transactionType - 'income' | 'expense'
 * @param categoryKey - カテゴリキー
 * @param debitAmount - 借方金額（円）
 * @param creditAmount - 貸方金額（円）
 * @returns Counterpart明細記載が必要な場合true
 *
 * @example
 * ```typescript
 * requiresCounterpartDetail('expense', 'expense_office_expenses', 150_000, 150_000) // true
 * requiresCounterpartDetail('expense', 'expense_office_expenses', 50_000, 50_000)   // true（基準以上）
 * requiresCounterpartDetail('income', 'income_donation_individual', 150_000, 150_000) // false（寄附は対象外）
 * ```
 */
export function requiresCounterpartDetail(
  transactionType: "income" | "expense",
  categoryKey: string,
  debitAmount: number,
  creditAmount: number,
): boolean {
  if (!isCounterpartRequired(transactionType, categoryKey)) {
    return false;
  }
  if (transactionType === "expense") {
    return isExpenseDetailRequired(debitAmount, creditAmount);
  }
  return true;
}

/** Counterpart明細記載が必要なトランザクションの絞り込み条件の 1 つ */
interface CounterpartDetailCriterion {
  transactionType: "income" | "expense";
  categoryKeys: readonly string[];
  /** 借方・貸方金額の条件（いずれか 1 つを満たせばよい）。null なら金額を問わない */
  amountConditions: RawExpenseAmountCondition[] | null;
}

/**
 * Counterpart明細記載が必要なトランザクションの絞り込み条件（いずれか 1 つを満たせばよい）
 *
 * requiresCounterpartDetail が true になる取引を、データベースで絞り込むための条件。
 * - 支出: Counterpart紐づけ対象の支出カテゴリで、金額が明細記載の基準以上
 * - 収入: Counterpart紐づけ対象の収入カテゴリ（金額を問わない）
 */
export function getCounterpartDetailCriteria(): CounterpartDetailCriterion[] {
  return [
    {
      transactionType: "expense",
      categoryKeys: COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
      amountConditions: getExpenseDetailRawAmountConditions(),
    },
    {
      transactionType: "income",
      categoryKeys: COUNTERPART_REQUIRED_INCOME_CATEGORIES,
      amountConditions: null,
    },
  ];
}
