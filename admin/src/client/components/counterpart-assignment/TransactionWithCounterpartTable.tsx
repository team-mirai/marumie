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
              <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
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
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-left py-3 px-4 text-muted-foreground font-medium"
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
