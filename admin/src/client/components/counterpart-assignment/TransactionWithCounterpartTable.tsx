"use client";
import "client-only";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";
import { cn } from "@/client/lib";
import { CounterpartCombobox } from "./CounterpartCombobox";

interface TransactionWithCounterpartTableProps {
  transactions: TransactionWithCounterpart[];
  sortField: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder: "asc" | "desc";
  onSortChange: (field: "transactionDate" | "debitAmount" | "categoryKey") => void;
  allCounterparts: Counterpart[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  politicalOrganizationId: string;
}

const columnHelper = createColumnHelper<TransactionWithCounterpart>();

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

const DEFAULT_CATEGORY_COLOR = "#64748B"; // slate-500 as default fallback color

function getCategoryInfo(categoryKey: string): {
  label: string;
  color: string;
  type: string | undefined;
} {
  for (const [, value] of Object.entries(PL_CATEGORIES)) {
    if (value.key === categoryKey) {
      return {
        label: value.shortLabel || value.category,
        color: value.color || DEFAULT_CATEGORY_COLOR,
        type: value.type,
      };
    }
  }
  return {
    label: categoryKey,
    color: DEFAULT_CATEGORY_COLOR,
    type: undefined,
  };
}

export function TransactionWithCounterpartTable({
  transactions,
  sortField,
  sortOrder,
  onSortChange,
  allCounterparts,
  rowSelection,
  onRowSelectionChange,
  politicalOrganizationId,
}: TransactionWithCounterpartTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring focus:ring-offset-0 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring focus:ring-offset-0 cursor-pointer"
          />
        ),
      }),
      columnHelper.accessor("transactionDate", {
        header: () => (
          <button
            type="button"
            onClick={() => onSortChange("transactionDate")}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            日付
            {sortField === "transactionDate" && (
              <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
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
              <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ),
        cell: (info) => {
          const transaction = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span>{formatAmount(info.getValue())}</span>
              {transaction.requiresCounterpart && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                  取引先必須
                </span>
              )}
            </div>
          );
        },
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
              <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ),
        cell: (info) => {
          const categoryInfo = getCategoryInfo(info.getValue());
          return (
            <div
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                categoryInfo.type === "income" ? "text-black" : "text-white"
              }`}
              style={{ backgroundColor: categoryInfo.color }}
            >
              {categoryInfo.label}
            </div>
          );
        },
      }),
      columnHelper.accessor("friendlyCategory", {
        header: "詳細区分",
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("description", {
        header: "摘要",
        cell: (info) => info.getValue() || "-",
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
              politicalOrganizationId={politicalOrganizationId}
            />
          );
        },
      }),
    ],
    [sortField, sortOrder, onSortChange, allCounterparts, politicalOrganizationId],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(newSelection);
    },
    getRowId: (row) => row.id,
  });

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">該当するTransactionがありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-left py-2 px-4 text-muted-foreground font-medium whitespace-nowrap"
                >
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
              className="border-b border-border hover:bg-secondary/30 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    "py-2 px-4 text-white",
                    cell.column.id !== "description" && "whitespace-nowrap",
                  )}
                >
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
