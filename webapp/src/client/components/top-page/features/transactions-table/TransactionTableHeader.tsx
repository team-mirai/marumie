import Image from "next/image";
import { useState } from "react";
import CategoryFilter from "./CategoryFilter";

interface TransactionTableHeaderProps {
  allowControl?: boolean;
  onSort?: (field: "date" | "amount") => void;
  currentSort?: "date" | "amount" | null;
  currentOrder?: "asc" | "desc" | null;
  onApplyFilter?: (selectedKeys: string[]) => void;
  selectedCategories?: string[];
}

export default function TransactionTableHeader({
  allowControl = false,
  onSort,
  currentSort,
  currentOrder,
  onApplyFilter,
  selectedCategories,
}: TransactionTableHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  return (
    <thead className="hidden md:table-header-group bg-white">
      <tr className="h-12 border-b border-[#D5DBE1]">
        {/* 日付 - 140px width to match row */}
        <th className="text-left px-4 h-12 font-normal w-[140px]" scope="col">
          {allowControl && onSort ? (
            <button
              type="button"
              onClick={() => onSort("date")}
              className="flex items-center gap-1 h-5 hover:opacity-70 transition-opacity cursor-pointer"
              aria-label="日付順でソート"
              aria-describedby="sort-date-description"
            >
              <span className="text-gray-800 text-sm font-bold leading-[1.5]">日付</span>
              <div className="w-5 h-5 flex items-center justify-center">
                <Image
                  src="/icons/icon-chevron-down.svg"
                  alt="Sort by date"
                  width={20}
                  height={20}
                  className={`w-5 h-5 transition-transform ${
                    currentSort === "date" ? (currentOrder === "asc" ? "rotate-180" : "") : ""
                  } ${currentSort === "date" ? "opacity-100" : "opacity-50"}`}
                />
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1 h-5">
              <span className="text-gray-800 text-sm font-bold leading-[1.5]">日付</span>
            </div>
          )}
        </th>

        {/* カテゴリー - 160px width to match row */}
        <th
          className="text-left pl-4 h-12 font-normal w-[160px] relative overflow-visible"
          scope="col"
        >
          {allowControl ? (
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-1 h-12 hover:opacity-70 transition-opacity cursor-pointer"
              aria-label="カテゴリーフィルター"
            >
              <span className="text-gray-800 text-sm font-bold leading-[1.5]">カテゴリー</span>
              <div className="w-3 h-2 flex items-center justify-center">
                <Image
                  src="/icons/icon-filter.svg"
                  alt="Filter category"
                  width={12}
                  height={8}
                  className="w-3 h-2"
                />
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1 h-12">
              <span className="text-gray-800 text-sm font-bold leading-[1.5]">カテゴリー</span>
            </div>
          )}
          <CategoryFilter
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            onApplyFilter={onApplyFilter || (() => {})}
            selectedCategories={selectedCategories}
          />
        </th>

        {/* 項目項目 - flexible width to match row */}
        <th className="text-left h-12 font-normal" scope="col">
          <div className="flex items-center h-5">
            <span className="text-gray-800 text-sm font-bold leading-[1.286] tracking-[0.071em]">
              項目
            </span>
          </div>
        </th>

        {/* 金額 - 180px width to match row (combined plus/minus + amount) */}
        <th className="text-right pr-6 h-12 font-normal w-[180px]" scope="col">
          {allowControl && onSort ? (
            <button
              type="button"
              onClick={() => onSort("amount")}
              className="flex items-center gap-1 h-5 hover:opacity-70 transition-opacity ml-auto cursor-pointer"
              aria-label="金額順でソート"
              aria-describedby="sort-amount-description"
            >
              <span className="text-gray-800 text-sm font-bold leading-[1.5]">金額</span>
              <div className="w-5 h-5 flex items-center justify-center">
                <Image
                  src="/icons/icon-chevron-down.svg"
                  alt="Sort by amount"
                  width={20}
                  height={20}
                  className={`w-5 h-5 transition-transform ${
                    currentSort === "amount" ? (currentOrder === "asc" ? "rotate-180" : "") : ""
                  } ${currentSort === "amount" ? "opacity-100" : "opacity-50"}`}
                />
              </div>
            </button>
          ) : (
            <div className="flex items-center justify-end gap-1 h-5">
              <span className="text-gray-800 text-sm font-bold leading-[1.5]">金額</span>
            </div>
          )}
        </th>
      </tr>
    </thead>
  );
}
