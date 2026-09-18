/**
 * 勘定科目の借方・貸方合計から、収入・支出の正味（ネット）集計を組み立てるドメインサービス
 *
 * 通常の仕訳では収入科目は貸方に、支出科目は借方に現れる。
 * 一方、返金（寄附・党費の返金、公費の返金など）の仕訳では
 * 収入科目が借方に、支出科目が貸方に現れる。
 * 返金をそれぞれ反対側のノードとして積むと収入・支出の総額が実態より大きく見えるため、
 * 同じカテゴリ／サブカテゴリから差し引いた正味として集計する。
 *
 * - 収入の正味 = 収入科目の貸方合計 − 収入科目の借方合計
 * - 支出の正味 = 支出科目の借方合計 − 支出科目の貸方合計
 */

import { BS_CATEGORIES, PL_CATEGORIES } from "@/shared/accounting/account-category";
import type {
  SankeyCategoryAggregationResult,
  TransactionCategoryAggregation,
} from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";

/**
 * 勘定科目ごとの片側（借方 or 貸方）の合計金額
 */
interface AccountSideTotal {
  account: string;
  /** friendly-category モードで subcategory として使うタグ */
  tag?: string;
  amount: number;
}

interface BuildOptions {
  /** true の場合、subcategory を PL_CATEGORIES ではなく tag から決める（friendly-category モード） */
  useTagAsSubcategory?: boolean;
}

type AccountKind = "income" | "expense" | "balance-sheet" | "unknown";

/**
 * 借方・貸方の科目別合計から、収入・支出の正味集計を組み立てる
 *
 * 正味が 0 未満になる項目（過年度の収入を当年度に返金した場合など）もそのまま返す。
 * 描画時の扱いは SankeyDataBuilder 側で行う。
 */
export function buildNetCategoryAggregation(
  creditSide: AccountSideTotal[],
  debitSide: AccountSideTotal[],
  options: BuildOptions = {},
): SankeyCategoryAggregationResult {
  const income = new Map<string, TransactionCategoryAggregation>();
  const expense = new Map<string, TransactionCategoryAggregation>();

  for (const item of creditSide) {
    const kind = classifyAccount(item.account);
    if (kind === "balance-sheet") {
      // BS科目（仮払金・立替金など）は収入・支出ノードとして表示しない。
      // 未払費用などBS科目の特別表示は別途 adjustWithBalance で行う。
      continue;
    }
    if (kind === "expense") {
      // 貸方に来た支出科目は支出の返金。支出から差し引く
      accumulate(expense, item, -item.amount, options);
    } else {
      accumulate(income, item, item.amount, options);
    }
  }

  for (const item of debitSide) {
    const kind = classifyAccount(item.account);
    if (kind === "balance-sheet") {
      continue;
    }
    if (kind === "income") {
      // 借方に来た収入科目は収入の返金。収入から差し引く
      accumulate(income, item, -item.amount, options);
    } else {
      accumulate(expense, item, item.amount, options);
    }
  }

  return {
    income: Array.from(income.values()),
    expense: Array.from(expense.values()),
  };
}

function classifyAccount(account: string): AccountKind {
  if (Object.hasOwn(PL_CATEGORIES, account)) {
    return PL_CATEGORIES[account].type;
  }
  if (Object.hasOwn(BS_CATEGORIES, account)) {
    return "balance-sheet";
  }
  return "unknown";
}

function accumulate(
  target: Map<string, TransactionCategoryAggregation>,
  item: AccountSideTotal,
  amount: number,
  options: BuildOptions,
): void {
  const mapping: { category: string; subcategory?: string } = Object.hasOwn(
    PL_CATEGORIES,
    item.account,
  )
    ? PL_CATEGORIES[item.account]
    : { category: item.account };

  const subcategory = options.useTagAsSubcategory ? item.tag || undefined : mapping.subcategory;
  const key = subcategory ? `${mapping.category}|${subcategory}` : mapping.category;

  const existing = target.get(key);
  if (existing) {
    existing.totalAmount += amount;
    return;
  }

  target.set(key, {
    category: mapping.category,
    subcategory,
    totalAmount: amount,
  });
}
