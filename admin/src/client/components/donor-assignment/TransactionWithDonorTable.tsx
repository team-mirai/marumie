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
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";
import { PL_CATEGORIES } from "@/shared/accounting/account-category";
import { cn, formatDate, formatAmount } from "@/client/lib";

interface TransactionWithDonorTableProps {
  transactions: TransactionWithDonor[];
  sortField: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder: "asc" | "desc";
  onSortChange: (field: "transactionDate" | "debitAmount" | "categoryKey") => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onAssignClick: (transaction: TransactionWithDonor) => void;
}

const columnHelper = createColumnHelper<TransactionWithDonor>();

const DEFAULT_CATEGORY_COLOR = "#64748B";

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

export function TransactionWithDonorTable({
  transactions,
  sortField,
  sortOrder,
  onSortChange,
  rowSelection,
  onRowSelectionChange,
  onAssignClick,
}: TransactionWithDonorTableProps) {
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
      columnHelper.accessor("donor", {
        header: "寄付者",
        cell: (info) => {
          const transaction = info.row.original;
          const donor = transaction.donor;
          return (
            <button
              type="button"
              onClick={() => onAssignClick(transaction)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors duration-200 hover:bg-secondary cursor-pointer ${
                donor ? "bg-input border-border" : "bg-yellow-400/10 border-yellow-400/30"
              }`}
            >
              {donor ? (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">{donor.name}</span>
                    <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                      {DONOR_TYPE_LABELS[donor.donorType]}
                    </span>
                  </div>
                  {donor.address && (
                    <span className="text-muted-foreground text-xs truncate">{donor.address}</span>
                  )}
                </div>
              ) : (
                <span className="text-yellow-400">未設定</span>
              )}
            </button>
          );
        },
      }),
    ],
    [sortField, sortOrder, onSortChange, onAssignClick],
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
