import ResearchFundCategoryInfoPill from "@/client/components/research-fund/ResearchFundCategoryInfoPill";
import type { ResearchFundCategoryView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const PILL_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-full border bg-white px-3 py-px text-xs font-medium leading-5";

/**
 * 費目のピル。既存の支出カテゴリと同じ「白背景・カテゴリ色の枠と文字」の形式。
 * 「住居費（議員宿舎・宿泊費）」のように括弧書きのある費目は、括弧部分を一回り小さくする。
 * 説明を持つ科目（交通費）は、表示名の右に情報アイコンを付けて説明の吹き出しを出す。
 */
export default function ResearchFundCategoryPill({
  category,
}: {
  category: ResearchFundCategoryView;
}) {
  const parenIndex = category.label.indexOf("（");
  const main = parenIndex < 0 ? category.label : category.label.slice(0, parenIndex);
  const sub = parenIndex < 0 ? "" : category.label.slice(parenIndex);
  const style = { borderColor: category.color, color: category.color };
  const content = (
    <>
      {main}
      {sub && <span className="text-[10px]">{sub}</span>}
    </>
  );

  if (category.description) {
    return (
      <ResearchFundCategoryInfoPill
        label={category.label}
        description={category.description}
        className={PILL_CLASS}
        style={style}
      >
        {content}
      </ResearchFundCategoryInfoPill>
    );
  }

  return (
    <span className={PILL_CLASS} style={style}>
      {content}
    </span>
  );
}
