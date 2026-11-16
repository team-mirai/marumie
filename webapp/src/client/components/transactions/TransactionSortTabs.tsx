import { TRANSACTION_SORT_TABS, type TransactionSort } from "@/client/lib/transaction-sort";

interface Props {
  current: TransactionSort;
  onChange: (sort: TransactionSort) => void;
  className?: string;
}

/**
 * SP（≤640px）の表の上に出す並び替えタブ。PC では列見出しのボタンで並び替えるので出さない。
 *
 * サンキー図の区分の切り替えと同じ見た目（下に1本の罫線、選んだものは黒字＋黒の太い下線）で、4つを1行に収める。
 */
export default function TransactionSortTabs({ current, onChange, className = "" }: Props) {
  return (
    <fieldset
      className={`m-0 flex min-w-0 justify-between gap-1.5 border-0 border-b border-solid border-[#DCE4E1] p-0 min-[641px]:hidden ${className}`}
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
            className={`relative -mb-px h-11 flex-none cursor-pointer touch-manipulation whitespace-nowrap border-b-[3px] p-0 text-[15px] leading-none font-bold transition-colors ${
              selected ? "border-black text-black" : "border-transparent text-[#5B6470]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </fieldset>
  );
}
