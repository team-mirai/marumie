"use client";
import "client-only";

import Image from "next/image";
import { useState } from "react";
import type { ResearchFundCategoryView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  options: ResearchFundCategoryView[];
  /** 確定済みの選択。ポップオーバーを開くたびにここから下書きを作り直す */
  selected: string[];
  onApply: (selected: string[]) => void;
  onCancel: () => void;
}

function CheckRow({
  label,
  checked,
  onClick,
  className,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-md px-1 py-[6px] transition-colors hover:bg-[#F1F5F9] ${className}`}
    >
      <span className="relative h-[18px] w-[18px] flex-shrink-0">
        {checked && (
          <Image
            src="/icons/icon-checkmark.svg"
            alt=""
            width={13}
            height={11}
            className="absolute top-[4px] left-[2.5px]"
          />
        )}
      </span>
      <span
        className={`flex-1 text-left text-[13px] leading-[1.54] text-[#47474C] ${
          checked ? "font-semibold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * 全件ページのカテゴリー絞り込み（既存の CategoryFilter と同じ見た目）。
 *
 * チェックはポップオーバー内の下書きにだけ反映し、「OK」で確定する。
 * 「キャンセル」なら下書きを捨てるので、選択は開く前に戻る。
 */
export default function ResearchFundCategoryFilter({
  options,
  selected,
  onApply,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<string[]>(selected);
  const allChecked = options.length > 0 && options.every((option) => draft.includes(option.label));

  const toggle = (label: string) =>
    setDraft((prev) =>
      prev.includes(label) ? prev.filter((value) => value !== label) : [...prev, label],
    );

  return (
    <div className="absolute top-full left-4 z-[9999] mt-1 flex flex-col gap-4 rounded bg-white p-4 shadow-[2px_4px_8px_0px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-1">
        <span className="text-sm leading-[1.67] font-medium text-gray-600">支出カテゴリー</span>
        <div className="flex flex-col">
          <CheckRow
            label="（すべて選択）"
            checked={allChecked}
            onClick={() => setDraft(allChecked ? [] : options.map((option) => option.label))}
            className="w-[236px]"
          />
          <div className="flex flex-col pl-4">
            {options.map((option) => (
              <CheckRow
                key={option.label}
                label={option.label}
                checked={draft.includes(option.label)}
                onClick={() => toggle(option.label)}
                className="w-[220px]"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex w-[120px] cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#D1D5DB] bg-[#F1F5F9] px-4 py-2 text-sm leading-[1.29] font-medium text-[#238778] transition-opacity hover:opacity-70"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => onApply(options.map((o) => o.label).filter((l) => draft.includes(l)))}
          className="flex w-[120px] cursor-pointer items-center justify-center rounded-[6px] bg-[#2AA693] px-4 py-2 text-sm leading-[1.29] font-medium text-white transition-opacity hover:opacity-90"
        >
          OK
        </button>
      </div>
    </div>
  );
}
