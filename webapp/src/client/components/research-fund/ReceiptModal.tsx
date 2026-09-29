"use client";
import "client-only";
import { useEffect, useRef } from "react";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import type {
  ResearchFundCategoryView,
  ResearchFundExpenseView,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  expense: ResearchFundExpenseView;
  category: ResearchFundCategoryView;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 領収書の原本。署名URLはリクエストのたびに発行するので、画像はこのエンドポイント経由で読む。 */
function receiptUrl(entryId: string): string {
  return `/api/research-fund/receipts/${encodeURIComponent(entryId)}`;
}

export default function ReceiptModal({ expense, category, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 開いたら「閉じる」へフォーカスを移し、閉じたら（どの閉じ方でもアンマウントされる）開く前の要素（「領収書」ピル）へ戻す。
  // onClose は親の再描画のたびに変わるので、フォーカスの移動は Esc の購読とは別にマウント時だけ行う。
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      // Tab / Shift+Tab でダイアログの外へ出ないよう、端で反対側へ循環させる
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      const inside = active instanceof Node && dialogRef.current.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="領収書"
        className="relative flex max-h-[88vh] w-full max-w-[520px] flex-col gap-6 overflow-auto rounded-3xl bg-white p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xl font-bold text-gray-800">領収書</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[15px] font-bold text-[#238778]"
          >
            閉じる
          </button>
        </div>

        <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-3 text-sm text-gray-800">
          <dt className="font-bold text-[#6B7280]">日付</dt>
          <dd className="font-bold">{expense.date.replace(/-/g, ".")}</dd>
          <dt className="font-bold text-[#6B7280]">カテゴリー</dt>
          <dd>
            <ResearchFundCategoryPill category={category} />
          </dd>
          <dt className="font-bold text-[#6B7280]">項目</dt>
          <dd className="font-bold">{expense.description}</dd>
          <dt className="font-bold text-[#6B7280]">金額</dt>
          <dd
            className={`font-bold ${expense.kind === "grant" ? "text-[#238778]" : "text-[#DC2626]"}`}
          >
            {expense.kind === "grant" ? "+" : "-"}
            {expense.amount.toLocaleString("ja-JP")} 円
          </dd>
          <dt className="font-bold text-[#6B7280]">特記事項</dt>
          <dd className="leading-[1.7]">{expense.note ?? "特記事項はありません"}</dd>
        </dl>

        {expense.receiptKind === "image" ? (
          /* 署名URLへのリダイレクトを返すエンドポイントなので、next/image の最適化は使えない */
          <img
            src={receiptUrl(expense.entryId)}
            alt={`${expense.description}の領収書`}
            className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center">
            <p className="text-sm text-[#6B7280]">
              {expense.receiptKind === "pdf"
                ? "PDF形式の領収書です。別のタブで開いて確認できます。"
                : "この形式の領収書はここでは表示できません。別のタブで開いて確認できます。"}
            </p>
            <a
              href={receiptUrl(expense.entryId)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${expense.description}の領収書を開く`}
              className="inline-flex h-9 items-center rounded-full border border-[#238778] px-4 text-sm font-bold text-[#238778] hover:bg-[#E2F6F3]"
            >
              領収書を開く
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
