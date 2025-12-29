/**
 * 政治資金報告書におけるCounterpart紐づけルールを定義するドメインモデル
 *
 * このファイルは報告書の仕様（docs/report_format.md）に基づき、
 * どのトランザクションがCounterpart情報を必要とするかを定義します。
 */

import { PL_CATEGORIES } from "@/shared/accounting/account-category";

/**
 * Counterpart紐づけが必要な収入カテゴリ
 * - loans: 借入金（SYUUSHI07_04）
 * - grants: 本部・支部交付金（SYUUSHI07_05）
 *
 * ※ キーは shared/utils/category-mapping.ts の PL_CATEGORIES.key と一致させる
 */
export const COUNTERPART_REQUIRED_INCOME_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["借入金"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["本部又は支部から供与された交付金に係る収入"].key,
] as const;

/**
 * 経常経費カテゴリ（SYUUSHI07_14）- 閾値10万円
 */
export const ROUTINE_EXPENSE_CATEGORIES = [
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["光熱水費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["備品・消耗品費"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["事務所費"].key,
] as const;

/**
 * 政治活動費カテゴリ（SYUUSHI07_15）- 閾値5万円
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
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["寄附・交付金"].key,
  // biome-ignore lint/complexity/useLiteralKeys: 日本語キー
  PL_CATEGORIES["その他の経費"].key,
] as const;

/**
 * Counterpart紐づけが必要な支出カテゴリ
 * 経常経費（SYUUSHI07_14）と政治活動費（SYUUSHI07_15）のすべて
 *
 * ※ キーは shared/utils/category-mapping.ts の PL_CATEGORIES.key と一致させる
 */
export const COUNTERPART_REQUIRED_EXPENSE_CATEGORIES = [
  ...ROUTINE_EXPENSE_CATEGORIES,
  ...POLITICAL_ACTIVITY_EXPENSE_CATEGORIES,
] as const;

export type CounterpartRequiredIncomeCategory =
  (typeof COUNTERPART_REQUIRED_INCOME_CATEGORIES)[number];

export type CounterpartRequiredExpenseCategory =
  (typeof COUNTERPART_REQUIRED_EXPENSE_CATEGORIES)[number];

export type CounterpartRequiredCategory =
  | CounterpartRequiredIncomeCategory
  | CounterpartRequiredExpenseCategory;

/**
 * Counterpart明細記載が必要な金額閾値（円）
 *
 * 政治資金規正法では、一定金額以上の支出について
 * 支払先の氏名・住所を明細に記載する必要があります。
 *
 * 参考: docs/report_format.md
 * - 経常経費（SYUUSHI07_14）: 10万円以上
 * - 政治活動費（SYUUSHI07_15）: 5万円以上
 * - 収入（借入金・交付金）: 閾値なし（すべて記載）
 */
export const ROUTINE_EXPENSE_THRESHOLD = 100_000;
export const POLITICAL_ACTIVITY_EXPENSE_THRESHOLD = 50_000;

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
 * カテゴリに応じた閾値を取得
 *
 * @param categoryKey - カテゴリキー
 * @returns 閾値（円）。収入カテゴリの場合は0（すべて記載必須）
 */
export function getThresholdForCategory(categoryKey: string): number {
  if (
    ROUTINE_EXPENSE_CATEGORIES.includes(categoryKey as (typeof ROUTINE_EXPENSE_CATEGORIES)[number])
  ) {
    return ROUTINE_EXPENSE_THRESHOLD;
  }
  if (
    POLITICAL_ACTIVITY_EXPENSE_CATEGORIES.includes(
      categoryKey as (typeof POLITICAL_ACTIVITY_EXPENSE_CATEGORIES)[number],
    )
  ) {
    return POLITICAL_ACTIVITY_EXPENSE_THRESHOLD;
  }
  // 収入カテゴリ（借入金・交付金）は閾値なし
  return 0;
}

/**
 * トランザクション金額が明細記載閾値を超えているかどうかを判定
 *
 * @param categoryKey - カテゴリキー
 * @param amount - 金額（円）
 * @returns 閾値以上の場合true
 *
 * @example
 * ```typescript
 * isAboveDetailThreshold('expense_office_expenses', 150_000) // true（経常経費、10万円以上）
 * isAboveDetailThreshold('expense_office_expenses', 50_000)  // false（経常経費、10万円未満）
 * isAboveDetailThreshold('expense_organization_activities', 50_000) // true（政治活動費、5万円以上）
 * ```
 */
export function isAboveDetailThreshold(categoryKey: string, amount: number): boolean {
  const threshold = getThresholdForCategory(categoryKey);
  return amount >= threshold;
}

/**
 * Counterpart明細記載が必要なトランザクションかどうかを総合判定
 *
 * 以下の条件をすべて満たす場合にtrue:
 * 1. カテゴリがCounterpart紐づけ対象である
 * 2. 金額が閾値以上である
 *
 * @param transactionType - 'income' | 'expense'
 * @param categoryKey - カテゴリキー
 * @param amount - 金額（円）
 * @returns Counterpart明細記載が必要な場合true
 *
 * @example
 * ```typescript
 * requiresCounterpartDetail('expense', 'expense_office_expenses', 150_000) // true
 * requiresCounterpartDetail('expense', 'expense_office_expenses', 50_000)  // false（閾値未満）
 * requiresCounterpartDetail('income', 'income_donation_individual', 150_000) // false（寄附は対象外）
 * ```
 */
export function requiresCounterpartDetail(
  transactionType: "income" | "expense",
  categoryKey: string,
  amount: number,
): boolean {
  return (
    isCounterpartRequired(transactionType, categoryKey) &&
    isAboveDetailThreshold(categoryKey, amount)
  );
}
