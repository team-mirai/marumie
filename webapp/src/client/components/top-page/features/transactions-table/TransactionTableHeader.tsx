import Image from "next/image";
import { useState } from "react";
import ColumnSortButton from "@/client/components/transactions/ColumnSortButton";
import {
  amountColumnSortState,
  dateColumnSortState,
  toggleAmountSort,
  toggleDateSort,
  type TransactionSort,
} from "@/client/lib/transaction-sort";
import CategoryFilter from "./CategoryFilter";

interface TransactionTableHeaderProps {
  allowControl?: boolean;
  sort?: TransactionSort;
  onSortChange?: (sort: TransactionSort) => void;
  onApplyFilter?: (selectedKeys: string[]) => void;
  selectedCategories?: string[];
}

export default function TransactionTableHeader({
  allowControl = false,
  sort = "new",
  onSortChange,
  onApplyFilter,
  selectedCategories,
}: TransactionTableHeaderProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const sortChange = allowControl ? onSortChange : undefined;
  const dateSort = dateColumnSortState(sort);
  const amountSort = amountColumnSortState(sort);

  return (
    <thead className="hidden min-[641px]:table-header-group bg-white">
      <tr className="h-12 border-b border-[#D5DBE1]">
        {/* 日付 - 140px width to match row */}
        <th
          className="text-left px-4 h-12 font-normal w-[140px]"
          scope="col"
          aria-sort={sortChange ? dateSort.ariaSort : undefined}
        >
          <div className="flex items-center h-5">
            <span className="text-gray-800 text-sm font-bold leading-[1.5]">日付</span>
            {sortChange && (
              <ColumnSortButton state={dateSort} onClick={() => sortChange(toggleDateSort(sort))} />
            )}
          </div>
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
          {isFilterOpen && (
            <CategoryFilter
              onClose={() => setIsFilterOpen(false)}
              onApplyFilter={onApplyFilter || (() => {})}
              selectedCategories={selectedCategories}
            />
          )}
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
        <th
          className="text-right pr-6 h-12 font-normal w-[180px]"
          scope="col"
          aria-sort={sortChange ? amountSort.ariaSort : undefined}
        >
          <div className="flex items-center justify-end h-5">
            <span className="text-gray-800 text-sm font-bold leading-[1.5]">金額</span>
            {sortChange && (
              <ColumnSortButton
                state={amountSort}
                onClick={() => sortChange(toggleAmountSort(sort))}
              />
            )}
          </div>
        </th>
      </tr>
    </thead>
  );
}
