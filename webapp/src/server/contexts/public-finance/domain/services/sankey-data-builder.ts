/**
 * CategoryAggregationからSankeyDataを構築するドメインサービス
 *
 * 責務:
 * - ノード生成（収入サブカテゴリ、収入カテゴリ、合計、支出カテゴリ、支出サブカテゴリ）
 * - リンク生成（サブカテゴリ→カテゴリ、カテゴリ→合計、合計→カテゴリ、カテゴリ→サブカテゴリ）
 * - 収支バランス調整（差額を「(仕訳中)」ノードとして追加）
 * - Safari互換ID生成
 */

import type { CategoryAggregation } from "@/server/contexts/public-finance/domain/models/category-aggregation";
import type {
  SankeyData,
  SankeyLink,
  SankeyNode,
} from "@/server/contexts/public-finance/domain/models/sankey-data";

/**
 * SankeyDataを構築するビルダークラス
 */
export class SankeyDataBuilder {
  /**
   * CategoryAggregationからSankeyDataを構築
   */
  build(aggregation: CategoryAggregation): SankeyData {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeIds = new Set<string>();

    // 収入サブカテゴリノードを生成し、カテゴリ別合計を計算
    const incomeByCategory = new Map<string, number>();

    for (const item of aggregation.income) {
      if (item.subcategory) {
        const nodeId = createSafariCompatibleId(`income-sub-${item.subcategory}`);
        if (!nodeIds.has(nodeId)) {
          nodes.push({
            id: nodeId,
            label: item.subcategory,
            nodeType: "income-sub",
          });
          nodeIds.add(nodeId);
        }
      }

      const current = incomeByCategory.get(item.category) || 0;
      incomeByCategory.set(item.category, current + item.totalAmount);
    }

    // 収入カテゴリノードを生成
    for (const category of incomeByCategory.keys()) {
      const nodeId = createSafariCompatibleId(`income-${category}`);
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: category,
          nodeType: "income",
        });
        nodeIds.add(nodeId);
      }
    }

    // 中央の「合計」ノードを生成
    nodes.push({
      id: createSafariCompatibleId("合計"),
      label: "合計",
      nodeType: "total",
    });

    // 支出カテゴリ別合計を計算
    const expenseByCategory = new Map<string, number>();

    for (const item of aggregation.expense) {
      const current = expenseByCategory.get(item.category) || 0;
      expenseByCategory.set(item.category, current + item.totalAmount);
    }

    // 収支バランスを確認し、収入 > 支出なら「(仕訳中)」を追加
    const totalIncome = Array.from(incomeByCategory.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const totalExpense = Array.from(expenseByCategory.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );

    // expense配列を変更可能なコピーに変換
    const expenseItems = [...aggregation.expense];

    if (totalIncome > totalExpense) {
      const currentBalance = totalIncome - totalExpense;
      expenseByCategory.set("(仕訳中)", currentBalance);

      expenseItems.push({
        category: "(仕訳中)",
        totalAmount: currentBalance,
      });
    }

    // 支出カテゴリノードを生成
    for (const category of expenseByCategory.keys()) {
      const nodeId = createSafariCompatibleId(`expense-${category}`);
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: category,
          nodeType: "expense",
        });
        nodeIds.add(nodeId);
      }
    }

    // 支出サブカテゴリノードを生成
    for (const item of expenseItems) {
      if (item.subcategory) {
        const nodeId = createSafariCompatibleId(`expense-sub-${item.subcategory}`);
        if (!nodeIds.has(nodeId)) {
          nodes.push({
            id: nodeId,
            label: item.subcategory,
            nodeType: "expense-sub",
          });
          nodeIds.add(nodeId);
        }
      }
    }

    // リンク生成: 収入サブカテゴリ → カテゴリ
    for (const item of aggregation.income) {
      if (item.subcategory) {
        links.push({
          source: createSafariCompatibleId(`income-sub-${item.subcategory}`),
          target: createSafariCompatibleId(`income-${item.category}`),
          value: item.totalAmount,
        });
      }
    }

    // リンク生成: 収入カテゴリ → 合計
    for (const [category, amount] of incomeByCategory) {
      links.push({
        source: createSafariCompatibleId(`income-${category}`),
        target: createSafariCompatibleId("合計"),
        value: amount,
      });
    }

    // リンク生成: 合計 → 支出カテゴリ
    for (const [category, amount] of expenseByCategory) {
      links.push({
        source: createSafariCompatibleId("合計"),
        target: createSafariCompatibleId(`expense-${category}`),
        value: amount,
      });
    }

    // リンク生成: 支出カテゴリ → サブカテゴリ
    for (const item of expenseItems) {
      if (item.subcategory) {
        links.push({
          source: createSafariCompatibleId(`expense-${item.category}`),
          target: createSafariCompatibleId(`expense-sub-${item.subcategory}`),
          value: item.totalAmount,
        });
      }
    }

    return { nodes, links };
  }
}

/**
 * 文字列をシンプルなハッシュに変換
 * Safari互換性のため、英数字のみを生成
 */
function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(36);
}

/**
 * ノードIDをSafari互換IDに変換
 * 英数字・ハイフン・アンダースコア以外の文字をハッシュに置換
 */
function createSafariCompatibleId(originalId: string): string {
  return originalId.replace(/[^a-zA-Z0-9\-_]/g, (match) => {
    return `_${generateHash(match)}`;
  });
}
