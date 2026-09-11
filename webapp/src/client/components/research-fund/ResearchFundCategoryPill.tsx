import type { ResearchFundCategoryView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

/**
 * 費目のピル。既存の支出カテゴリと同じ「白背景・カテゴリ色の枠と文字」の形式。
 * 「住居費（議員宿舎・宿泊費）」のように括弧書きのある費目は、括弧部分を一回り小さくする。
 */
export default function ResearchFundCategoryPill({
  category,
}: {
  category: ResearchFundCategoryView;
}) {
  const parenIndex = category.label.indexOf("（");
  const main = parenIndex < 0 ? category.label : category.label.slice(0, parenIndex);
  const sub = parenIndex < 0 ? "" : category.label.slice(parenIndex);

  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border bg-white px-3 py-px text-xs font-medium leading-5"
      style={{ borderColor: category.color, color: category.color }}
    >
      {main}
      {sub && <span className="text-[10px]">{sub}</span>}
    </span>
  );
}
