import { TRANSACTION_SORT_TABS, type TransactionSort } from "@/client/lib/transaction-sort";

interface Props {
  current: TransactionSort;
  onChange: (sort: TransactionSort) => void;
  className?: string;
}

/**
 * SP（≤640px）の表の上に出す並び替えタブ。PC では列見出しのボタンで並び替えるので出さない。
 *
 * サンキー図の区分の切り替えと同じ見た目と動き（下に1本の罫線、選んだものは黒字＋横に伸びて現れる黒の太い下線）で、4つを1行に収める。
 * 幅 375px 未満（320px など）では 15px の4つが1行に収まらずページが横にスクロールするので、文字と間隔を少し詰める。
 */
export default function TransactionSortTabs({ current, onChange, className = "" }: Props) {
  return (
    <fieldset
      className={`m-0 flex min-w-0 justify-between gap-1.5 max-[374px]:gap-1 border-0 border-b border-solid border-[#DCE4E1] p-0 min-[641px]:hidden ${className}`}
    >
      <legend className="sr-only">並び順</legend>
      {TRANSACTION_SORT_TABS.map((tab) => {
        const selected = current === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tab.id)}
            className={`tab-underline relative -mb-px h-11 flex-none cursor-pointer touch-manipulation whitespace-nowrap border-b-[3px] border-transparent p-0 text-[15px] max-[374px]:text-[14px] leading-none font-bold ${
              selected ? "text-black" : "text-[#5B6470]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </fieldset>
  );
}
