/**
 * カテゴリ別集計データを表現するドメインモデル
 *
 * リポジトリから取得したカテゴリ別の収入・支出データを保持し、
 * Sankeyダイアグラム用の変換ロジックを提供する
 */

/**
 * カテゴリ別集計の1項目
 */
export interface CategoryAggregationItem {
  category: string;
  subcategory?: string;
  totalAmount: number;
}

/**
 * カテゴリ別集計データ（収入・支出）
 */
export interface CategoryAggregation {
  income: CategoryAggregationItem[];
  expense: CategoryAggregationItem[];
}

/**
 * 残高情報
 */
export interface BalanceInfo {
  previousYearBalance: number;
  currentYearBalance: number;
  liabilityBalance: number;
}

/**
 * サブカテゴリ統合時のデフォルト上限数
 */
export const DEFAULT_SUBCATEGORY_MAX_COUNT = 8;

/**
 * CategoryAggregationのドメインロジック
 */
export const CategoryAggregation = {
  /**
   * 「その他」カテゴリを「その他の収入」「その他の支出」にリネーム
   *
   * 収入と支出で同じラベルだとSankeyノードが区別できないため、
   * 収支に応じて接尾辞を付加する
   */
  renameOtherCategories(data: CategoryAggregation): CategoryAggregation {
    const income = data.income.map((item) => ({
      ...item,
      category: item.category === "その他" ? "その他の収入" : item.category,
    }));

    const expense = data.expense.map((item) => ({
      ...item,
      category: item.category === "その他" ? "その他の支出" : item.category,
    }));

    return { income, expense };
  },

  /**
   * 小規模項目を「その他（カテゴリ名）」に統合
   *
   * friendly-categoryモードでサブカテゴリが多すぎる場合に適用し、
   * グラフの可読性を向上させる
   */
  consolidateSmallItems(
    data: CategoryAggregation,
    options: { targetMaxCount: number },
  ): CategoryAggregation {
    const incomeThreshold = calculateDynamicThreshold(data.income, options.targetMaxCount);
    const expenseThreshold = calculateDynamicThreshold(data.expense, options.targetMaxCount);

    const consolidatedIncome = consolidateSmallItemsByType(data.income, incomeThreshold);
    const consolidatedExpense = consolidateSmallItemsByType(data.expense, expenseThreshold);

    return {
      income: consolidatedIncome,
      expense: consolidatedExpense,
    };
  },

  /**
   * 残高情報を収入・支出データに追加
   *
   * - 昨年からの現金残高を収入側に追加
   * - 今年の現金残高を支出側に追加（friendlyモードでは未払費用と収支に分離）
   */
  adjustWithBalance(
    data: CategoryAggregation,
    balance: BalanceInfo,
    options: { isFriendlyCategory: boolean },
  ): CategoryAggregation {
    const result = {
      income: [...data.income],
      expense: [...data.expense],
    };

    // 昨年からの現金残高の追加（収入側）
    if (balance.previousYearBalance > 0) {
      result.income.push({
        category: "昨年からの現金残高",
        totalAmount: balance.previousYearBalance,
      });
    }

    // 今年の現金残高の追加（支出側、non-friendlyモード）
    if (balance.currentYearBalance > 0 && !options.isFriendlyCategory) {
      result.expense.push({
        category: "現金残高",
        totalAmount: balance.currentYearBalance,
      });
    }

    // 今年の現金残高の追加（支出側、friendlyモード）
    if (balance.currentYearBalance > 0 && options.isFriendlyCategory) {
      const unpaidAmount = Math.max(balance.liabilityBalance, 0);
      const actualCashBalance = Math.max(balance.currentYearBalance, 0);
      const balanceAmount = Math.max(0, actualCashBalance - unpaidAmount);

      if (unpaidAmount > 0) {
        result.expense.push({
          category: "現金残高",
          subcategory: "未払費用",
          totalAmount: unpaidAmount,
        });
      }

      if (balanceAmount > 0) {
        result.expense.push({
          category: "現金残高",
          subcategory: "収支",
          totalAmount: balanceAmount,
        });
      }
    }

    return result;
  },
};

/**
 * 動的閾値を計算
 *
 * サブカテゴリ数を上限に抑えるための閾値を計算する
 * - サブカテゴリ数が上限以下なら0（統合不要）
 * - 上限を超える場合は、上限番目の項目の金額と全体の1%の大きい方
 */
function calculateDynamicThreshold(
  items: Array<{ subcategory?: string; totalAmount: number }>,
  targetCount: number,
): number {
  const subcategoryItems = items.filter((item) => item.subcategory);

  if (subcategoryItems.length <= targetCount) {
    return 0;
  }

  const sortedItems = [...subcategoryItems].sort((a, b) => b.totalAmount - a.totalAmount);

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const onePercentThreshold = totalAmount * 0.01;

  const dynamicThreshold = sortedItems[targetCount - 1].totalAmount;

  return Math.max(dynamicThreshold, onePercentThreshold);
}

/**
 * 小規模項目を統合処理
 *
 * 閾値未満のサブカテゴリ項目をカテゴリごとにまとめる
 */
function consolidateSmallItemsByType(
  items: CategoryAggregationItem[],
  threshold: number,
): CategoryAggregationItem[] {
  // 閾値で大きいグループと小さいグループに分離
  const smallItems = items.filter((item) => item.subcategory && item.totalAmount < threshold);
  const largeItems = items.filter((item) => !item.subcategory || item.totalAmount >= threshold);

  // 小さいアイテムをカテゴリごとにグループ化
  const smallItemsByCategory = new Map<string, CategoryAggregationItem[]>();
  for (const item of smallItems) {
    const categoryItems = smallItemsByCategory.get(item.category) || [];
    smallItemsByCategory.set(item.category, [...categoryItems, item]);
  }

  // 小さいアイテムを統合処理
  const consolidatedSmallItems = Array.from(smallItemsByCategory).map(([category, categoryItems]) =>
    consolidateCategoryItems(category, categoryItems),
  );

  // 大きいアイテムと統合後の小さいアイテムをマージして返す
  return [...largeItems, ...consolidatedSmallItems];
}

/**
 * カテゴリ内の項目を統合
 *
 * - 1種類のみならそのまま返す
 * - 複数あれば金額を合算し「その他（カテゴリ名）」にまとめる
 */
function consolidateCategoryItems(
  category: string,
  categoryItems: CategoryAggregationItem[],
): CategoryAggregationItem {
  // 属するノードが1種類だけの場合はまとめずにそのまま残す
  if (categoryItems.length === 1) {
    return categoryItems[0];
  }

  // 複数の場合は統合
  const totalAmount = categoryItems.reduce((sum, item) => sum + item.totalAmount, 0);
  return {
    ...categoryItems[0],
    subcategory: `その他（${category}）`,
    totalAmount,
  };
}
