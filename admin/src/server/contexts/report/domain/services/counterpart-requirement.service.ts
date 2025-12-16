/**
 * 政治資金報告書における相手先情報記載の要否判定サービス
 *
 * 閾値ルール（docs/report_format.md に基づく）:
 * - 借入金・交付金: 全件記載が必要
 * - 経常経費（光熱水費・備品消耗品費・事務所費）: 5万円超
 * - 政治活動費: 5万円超
 * - その他の収入: 10万円以上
 */

/** 閾値定数 */
const EXPENSE_THRESHOLD = 50000; // 支出: 5万円超
const OTHER_INCOME_THRESHOLD = 100000; // その他収入: 10万円以上

/** 全件記載が必要なカテゴリキー */
const ALWAYS_REQUIRED_CATEGORY_KEYS = ["LOAN", "GRANT"] as const;

/** その他収入のカテゴリキー */
const OTHER_INCOME_CATEGORY_KEY = "OTHER";

export interface CounterpartRequirementInput {
  categoryKey: string;
  transactionType: "income" | "expense";
  amount: number;
}

/**
 * 取引が報告書の明細記載（Counterpart紐付け）が必要かを判定
 */
export function requiresCounterpart(input: CounterpartRequirementInput): boolean {
  const { categoryKey, transactionType, amount } = input;

  // 借入金・交付金は全件必要
  if (
    ALWAYS_REQUIRED_CATEGORY_KEYS.includes(
      categoryKey as (typeof ALWAYS_REQUIRED_CATEGORY_KEYS)[number],
    )
  ) {
    return true;
  }

  // 支出の場合: 5万円超
  if (transactionType === "expense") {
    return amount > EXPENSE_THRESHOLD;
  }

  // その他の収入: 10万円以上
  if (categoryKey === OTHER_INCOME_CATEGORY_KEY) {
    return amount >= OTHER_INCOME_THRESHOLD;
  }

  // その他（事業収入など）: 閾値なし、全件必要
  return true;
}
