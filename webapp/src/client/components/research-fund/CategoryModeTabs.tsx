"use client";
import "client-only";
import type { ResearchFundCategoryMode } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const TABS: { mode: ResearchFundCategoryMode; label: string }[] = [
  { mode: "detailed", label: "詳細の区分" },
  { mode: "legal", label: "法律上の区分" },
];

/** 区分トグル。文言・見た目とも既存の「収支の流れ」のタブに合わせる。 */
export default function CategoryModeTabs({
  value,
  onChange,
}: {
  value: ResearchFundCategoryMode;
  onChange: (mode: ResearchFundCategoryMode) => void;
}) {
  return (
    <div className="flex gap-7 border-b border-gray-300 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          onClick={() => onChange(tab.mode)}
          aria-pressed={value === tab.mode}
          className={`pb-2 font-bold text-base border-b-2 transition-colors leading-tight cursor-pointer ${
            value === tab.mode
              ? "border-[#238778] text-[#238778]"
              : "border-transparent text-[#9CA3AF] hover:text-gray-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
