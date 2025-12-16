"use client";
import "client-only";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";
import { CounterpartCombobox } from "./CounterpartCombobox";

interface TransactionWithCounterpartTableProps {
  transactions: TransactionWithCounterpart[];
  sortField: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder: "asc" | "desc";
  onSortChange: (field: "transactionDate" | "debitAmount" | "categoryKey") => void;
  allCounterparts: Counterpart[];
}

const columnHelper = createColumnHelper<TransactionWithCounterpart>();

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function getCategoryLabel(categoryKey: string): string {
  for (const [, value] of Object.entries(PL_CATEGORIES)) {
    if (value.key === categoryKey) {
      return value.shortLabel || value.category;
    }
  }
  return categoryKey;
}

export function TransactionWithCounterpartTable({
  transactions,
  sortField,
  sortOrder,
  onSortChange,
  allCounterparts,
}: TransactionWithCounterpartTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("transactionDate", {
        header: () => (
          <button
            type="button"
            onClick={() => onSortChange("transactionDate")}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            日付
            {sortField === "transactionDate" && (
              <span className="text-primary-accent">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ),
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor("debitAmount", {
        header: () => (
          <button
            type="button"
            onClick={() => onSortChange("debitAmount")}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            金額
            {sortField === "debitAmount" && (
              <span className="text-primary-accent">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ),
        cell: (info) => formatAmount(info.getValue()),
      }),
      columnHelper.accessor("categoryKey", {
        header: () => (
          <button
            type="button"
            onClick={() => onSortChange("categoryKey")}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            カテゴリ
            {sortField === "categoryKey" && (
              <span className="text-primary-accent">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ),
        cell: (info) => getCategoryLabel(info.getValue()),
      }),
      columnHelper.accessor("description", {
        header: "摘要",
        cell: (info) => (
          <span className="truncate max-w-[200px] block" title={info.getValue() ?? ""}>
            {info.getValue() || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("counterpart", {
        header: "取引先",
        cell: (info) => {
          const transaction = info.row.original;
          return (
            <CounterpartCombobox
              transactionId={transaction.id}
              currentCounterpart={transaction.counterpart}
              allCounterparts={allCounterparts}
            />
          );
        },
      }),
    ],
    [sortField, sortOrder, onSortChange, allCounterparts],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-primary-muted">該当するTransactionがありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-primary-border">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="text-left py-3 px-4 text-primary-muted font-medium">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-primary-border hover:bg-primary-hover/30 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-3 px-4 text-white">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
