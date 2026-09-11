import type { ResearchFundMonthView } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import type { ResearchFundAggregation } from "@/shared/research-fund/aggregation";

/**
 * B-2 の1年分（1月〜12月）を組み立てる。
 *
 * 公開範囲（published_through）より後の月は「まだ公開していない」ことが伝わるよう
 * 空欄にし、描画側が点線の空枠で描く。公開範囲の中にある月は、支出が無くても
 * 0円として実線で描く（データが無いのではなく、使っていないという意味）。
 */
export function buildMonthlyViews(
  monthly: ResearchFundAggregation["monthly"],
  financialYear: number,
  publishedThrough: string | null,
): ResearchFundMonthView[] {
  const totals = new Map(monthly.map((total) => [total.month, total]));
  const publishedThroughMonth = publishedThrough?.slice(0, 7) ?? null;

  return Array.from({ length: 12 }, (_, index) => {
    const month = `${financialYear}-${String(index + 1).padStart(2, "0")}`;
    const total = totals.get(month);
    const published = publishedThroughMonth !== null && month <= publishedThroughMonth;
    return {
      month,
      granted: published ? (total?.granted ?? 0) : 0,
      spent: published ? (total?.spent ?? 0) : 0,
      published,
    };
  });
}
