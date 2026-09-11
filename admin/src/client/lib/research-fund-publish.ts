import type { ResearchFundAggregation } from "@/shared/research-fund/aggregation";

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function signed(diff: number): string {
  return `${diff < 0 ? "−" : "+"}${yen(Math.abs(diff))}`;
}

/**
 * 公開前後の集計を突き合わせ、「公開すると：◯◯ +¥n・未使用 −¥n」の一文を作る。
 * 費目は増分の大きい順に並べ、未使用は増減どちらでも常に末尾に置く。
 */
export function describePublishDelta(
  before: ResearchFundAggregation,
  after: ResearchFundAggregation,
): string | null {
  const previous = new Map(
    before.categories.map((category) => [category.key, category.totalAmount]),
  );
  const parts = after.categories
    .filter((category) => category.kind !== "unused")
    .map((category) => ({
      label: category.label,
      diff: category.totalAmount - (previous.get(category.key) ?? 0),
    }))
    .filter((entry) => entry.diff !== 0)
    .sort((a, b) => b.diff - a.diff)
    .map((entry) => `${entry.label} ${signed(entry.diff)}`);
  const unused = after.unused - before.unused;
  if (unused !== 0) parts.push(`未使用 ${signed(unused)}`);
  return parts.length === 0 ? null : `公開すると：${parts.join("・")}`;
}
