import { PL_CATEGORIES } from "@/shared/accounting/account-category";
import type { TransactionType } from "@/shared/models/transaction";

/**
 * カテゴリピルの表示に必要な取引情報。
 * 取引一覧（TransactionWithOrganization）と CSV 取り込みプレビュー（PreviewTransaction）の
 * 両方が構造的に満たす最小の形にしている。
 */
export interface CategoryPillSource {
  debit_account: string;
  credit_account: string;
  transaction_type: TransactionType | null | undefined;
}

interface CategoryPillStyle {
  label: string;
  fontColor: string;
  borderColor: string;
  bgColor: string;
}

/** 収入ピルの文字色（webapp の TransactionTableRow と同じ値） */
const INCOME_FONT_COLOR = "#47474C";
/** PL_CATEGORIES に無い勘定科目のフォールバック色（webapp と同じ値） */
const FALLBACK_CATEGORY_COLOR = "#99F6E4";

/** 非現金仕訳のピル（ハンドオフ「カテゴリピル」節） */
const NON_CASH_JOURNAL_PILL: CategoryPillStyle = {
  label: "-",
  fontColor: "#666666",
  borderColor: "#CCCCCC",
  bgColor: "#FFFFFF",
};

/**
 * 取引からカテゴリ表示に使う勘定科目を決める。
 * - 相殺収入は貸方、相殺支出は借方
 * - それ以外は借方が費用系なら借方、そうでなければ貸方
 */
function resolveCategoryAccount(source: CategoryPillSource): string {
  if (source.transaction_type === "offset_income") {
    return source.credit_account;
  }
  if (source.transaction_type === "offset_expense") {
    return source.debit_account;
  }
  const debitInfo = PL_CATEGORIES[source.debit_account];
  return debitInfo?.type === "expense" ? source.debit_account : source.credit_account;
}

function isIncomeTransactionType(type: TransactionType | null | undefined): boolean {
  return type === "income" || type === "offset_income";
}

/**
 * カテゴリピルの表示ルール（webapp の取引テーブルと同一）。
 *
 * - 収入: 背景と枠がカテゴリ色、文字 `#47474C`
 * - 支出: 背景白、枠と文字がカテゴリ色
 * - 非現金仕訳: 背景白、枠 `#CCC`、文字 `#666`、ラベル「-」
 *
 * 色と略称は `PL_CATEGORIES` の `color` / `shortLabel` をそのまま使う。
 * admin 内のカテゴリピルはすべてこの関数を経由すること。
 */
export function resolveCategoryPill(source: CategoryPillSource): CategoryPillStyle {
  if (source.transaction_type === "non_cash_journal") {
    return NON_CASH_JOURNAL_PILL;
  }

  const account = resolveCategoryAccount(source);
  const mapping = PL_CATEGORIES[account];
  const isIncome = mapping
    ? mapping.type === "income"
    : isIncomeTransactionType(source.transaction_type);
  const label = mapping?.shortLabel ?? account;

  if (mapping?.color) {
    const color = mapping.color;
    return isIncome
      ? { label, fontColor: INCOME_FONT_COLOR, borderColor: color, bgColor: color }
      : { label, fontColor: color, borderColor: color, bgColor: "#FFFFFF" };
  }

  return {
    label,
    fontColor: INCOME_FONT_COLOR,
    borderColor: FALLBACK_CATEGORY_COLOR,
    bgColor: isIncome ? FALLBACK_CATEGORY_COLOR : "#FFFFFF",
  };
}

/**
 * カテゴリキー（`PL_CATEGORIES[*].key`。例: "individual-donations"）からカテゴリピルを解決する。
 * 紐付け画面など、勘定科目名ではなくキーだけを持つ取引で使う。表示ルールは `resolveCategoryPill` と同一。
 * 未知のキーはキー文字列をラベルにしたフォールバック色（支出扱い）で返す。
 */
export function resolveCategoryPillByKey(categoryKey: string): CategoryPillStyle {
  const mapping = Object.values(PL_CATEGORIES).find((value) => value.key === categoryKey);
  if (!mapping) {
    return {
      label: categoryKey,
      fontColor: INCOME_FONT_COLOR,
      borderColor: FALLBACK_CATEGORY_COLOR,
      bgColor: "#FFFFFF",
    };
  }
  const { color, shortLabel } = mapping;
  return mapping.type === "income"
    ? { label: shortLabel, fontColor: INCOME_FONT_COLOR, borderColor: color, bgColor: color }
    : { label: shortLabel, fontColor: color, borderColor: color, bgColor: "#FFFFFF" };
}
