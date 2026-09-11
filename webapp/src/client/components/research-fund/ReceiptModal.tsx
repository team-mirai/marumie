"use client";
import "client-only";
import { useEffect } from "react";
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

/** 領収書の原本。署名URLはリクエストのたびに発行するので、画像はこのエンドポイント経由で読む。 */
function receiptUrl(entryId: string): string {
  return `/api/research-fund/receipts/${encodeURIComponent(entryId)}`;
}

export default function ReceiptModal({ expense, category, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="領収書"
        className="relative flex max-h-[88vh] w-full max-w-[520px] flex-col gap-6 overflow-auto rounded-3xl bg-white p-8"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xl font-bold text-gray-800">領収書</span>
          <button
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
          <dd className="font-bold text-[#DC2626]">-{expense.amount.toLocaleString("ja-JP")} 円</dd>
          <dt className="font-bold text-[#6B7280]">特記事項</dt>
          <dd className="leading-[1.7]">{expense.note ?? "特記事項はありません"}</dd>
        </dl>

        {/* 署名URLへのリダイレクトを返すエンドポイントなので、next/image の最適化は使えない */}
        <img
          src={receiptUrl(expense.entryId)}
          alt={`${expense.description}の領収書`}
          className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]"
        />
      </div>
    </div>
  );
}
