import type { ColumnSortState } from "@/client/lib/transaction-sort";

interface Props {
  state: ColumnSortState;
  onClick: () => void;
}

/**
 * PC の表の列見出し（日付・金額）の並び替えボタン。
 *
 * 押せる範囲は 44px 四方にし、負の margin で見た目の位置（見出しの文字のすぐ右の矢印）を保つ。
 * 選択中の列は緑、そうでない列はグレーにする。読み上げ名で今の並び順を伝える。
 */
export default function ColumnSortButton({ state, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={state.label}
      className={`-my-2.5 -mr-2.5 -ml-1.5 inline-flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg align-middle leading-none ${
        state.active ? "text-[#0F8472]" : "text-[#6B7280]"
      }`}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`transition-transform ${state.flipped ? "rotate-180" : ""}`}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}
