import Link from "next/link";
import ResearchFundCategoryInfoPill from "@/client/components/research-fund/ResearchFundCategoryInfoPill";
import type { ResearchFundCategoryView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const PILL_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-full border bg-white px-3 py-px text-xs font-medium leading-5";

const LINK_CLASS = "cursor-pointer hover:underline";

/**
 * 費目のピル。既存の支出カテゴリと同じ「白背景・カテゴリ色の枠と文字」の形式。
 * 「住居費（議員宿舎・宿泊費）」のように括弧書きのある費目は、括弧部分を一回り小さくする。
 * 説明を持つ科目（交通費）は、表示名の右に情報アイコンを付けて説明の吹き出しを出す。
 *
 * href を渡すと表示名をリンクにする（全件ページでそのカテゴリーに絞り込む）。
 * リンクの中にボタンは入れられないので、説明を持つ科目ではリンクを表示名だけにし、情報アイコンのボタンはその隣に置く。
 */
export default function ResearchFundCategoryPill({
  category,
  href,
}: {
  category: ResearchFundCategoryView;
  href?: string;
}) {
  const parenIndex = category.label.indexOf("（");
  const main = parenIndex < 0 ? category.label : category.label.slice(0, parenIndex);
  const sub = parenIndex < 0 ? "" : category.label.slice(parenIndex);
  const style = { borderColor: category.color, color: category.color };
  const label = (
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
        {href ? (
          <Link href={href} className={LINK_CLASS}>
            {label}
          </Link>
        ) : (
          label
        )}
      </ResearchFundCategoryInfoPill>
    );
  }

  if (href) {
    return (
      <Link href={href} className={`${PILL_CLASS} ${LINK_CLASS}`} style={style}>
        {label}
      </Link>
    );
  }

  return (
    <span className={PILL_CLASS} style={style}>
      {label}
    </span>
  );
}
