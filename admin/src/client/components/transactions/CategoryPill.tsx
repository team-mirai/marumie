import {
  type CategoryPillSource,
  resolveCategoryPill,
  resolveCategoryPillByKey,
} from "@/client/lib";

type CategoryPillProps =
  | { transaction: CategoryPillSource; categoryKey?: never }
  | { categoryKey: string; transaction?: never };

/**
 * 勘定科目のカテゴリピル。表示ルールは webapp の取引テーブルと同一で、
 * 判定ロジックは `resolveCategoryPill` / `resolveCategoryPillByKey` に集約している
 * （admin 内で独自の色分岐を持たない）。色はデータ（PL_CATEGORIES）由来なので style で渡す。
 *
 * 勘定科目名を持つ取引は `transaction`、カテゴリキーだけを持つ取引（紐付け画面）は `categoryKey` で渡す。
 */
export function CategoryPill(props: CategoryPillProps) {
  const pill =
    props.transaction !== undefined
      ? resolveCategoryPill(props.transaction)
      : resolveCategoryPillByKey(props.categoryKey);

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
