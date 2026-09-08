import { type CategoryPillSource, resolveCategoryPill } from "@/client/lib";

interface CategoryPillProps {
  transaction: CategoryPillSource;
}

/**
 * 勘定科目のカテゴリピル。表示ルールは webapp の取引テーブルと同一で、
 * 判定ロジックは `resolveCategoryPill` に集約している（admin 内で独自の色分岐を持たない）。
 * 色はデータ（PL_CATEGORIES）由来なので style で渡す。
 */
export function CategoryPill({ transaction }: CategoryPillProps) {
  const pill = resolveCategoryPill(transaction);

  return (
    <span
      className="inline-block rounded-full border px-3 py-0.5 text-xs font-medium leading-[1.67] whitespace-nowrap"
      style={{
        backgroundColor: pill.bgColor,
        borderColor: pill.borderColor,
        color: pill.fontColor,
      }}
    >
      {pill.label}
    </span>
  );
}
