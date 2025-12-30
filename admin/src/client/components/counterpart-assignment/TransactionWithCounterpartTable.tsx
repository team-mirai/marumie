"use client";
import "client-only";

import { useMemo, useState, useCallback } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { PL_CATEGORIES } from "@/shared/accounting/account-category";
import { cn, formatDate, formatAmount } from "@/client/lib";
import { Switch, Tooltip, TooltipTrigger, TooltipContent } from "@/client/components/ui";
import { updateGrantExpenditureFlagAction } from "@/server/contexts/report/presentation/actions/update-grant-expenditure-flag";

interface TransactionWithCounterpartTableProps {
  transactions: TransactionWithCounterpart[];
  sortField: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder: "asc" | "desc";
  onSortChange: (field: "transactionDate" | "debitAmount" | "categoryKey") => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onAssignClick: (transaction: TransactionWithCounterpart) => void;
}

const columnHelper = createColumnHelper<TransactionWithCounterpart>();

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
  rowSelection,
  onRowSelectionChange,
  onAssignClick,
}: TransactionWithCounterpartTableProps) {
  const [grantExpenditureOverrides, setGrantExpenditureOverrides] = useState<
    Record<string, boolean>
  >({});

  const handleGrantExpenditureFlagChange = useCallback(
    async (transactionId: string, newValue: boolean) => {
      setGrantExpenditureOverrides((prev) => ({
        ...prev,
        [transactionId]: newValue,
      }));

      const result = await updateGrantExpenditureFlagAction(transactionId, newValue);

      if (!result.success) {
        setGrantExpenditureOverrides((prev) => {
          const updated = { ...prev };
          delete updated[transactionId];
          return updated;
        });
        toast.error(result.errors?.[0] ?? "交付金フラグの更新に失敗しました");
      }
    },
    [],
  );

  const getGrantExpenditureValue = useCallback(
    (transaction: TransactionWithCounterpart): boolean => {
      if (transaction.id in grantExpenditureOverrides) {
        return grantExpenditureOverrides[transaction.id];
      }
      return transaction.isGrantExpenditure;
    },
    [grantExpenditureOverrides],
  );

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
      columnHelper.accessor("isGrantExpenditure", {
        header: () => (
          <div className="flex items-center gap-1">
            <span>交付金</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-muted-foreground hover:text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    role="img"
                    aria-label="交付金フラグの説明"
                  >
                    <title>交付金フラグの説明</title>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                本部又は支部に対する交付金として支出したかどうかを示すフラグです。ONにすると、報告書のシート16「本部又は支部に対する交付金の支出」にも記載されます。
              </TooltipContent>
            </Tooltip>
          </div>
        ),
        cell: (info) => {
          const transaction = info.row.original;
          if (transaction.transactionType !== "expense") {
            return <span className="text-muted-foreground">-</span>;
          }
          const currentValue = getGrantExpenditureValue(transaction);
          return (
            <Switch
              checked={currentValue}
              onCheckedChange={(checked) =>
                handleGrantExpenditureFlagChange(transaction.id, checked)
              }
              className="cursor-pointer"
            />
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
          const counterpart = transaction.counterpart;
          return (
            <button
              type="button"
              onClick={() => onAssignClick(transaction)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors duration-200 hover:bg-secondary cursor-pointer ${
                counterpart ? "bg-input border-border" : "bg-yellow-400/10 border-yellow-400/30"
              }`}
            >
              {counterpart ? (
                <div className="flex flex-col">
                  <span className="text-white font-medium truncate">{counterpart.name}</span>
                  <span className="text-muted-foreground text-xs truncate">
                    {counterpart.address}
                  </span>
                </div>
              ) : (
                <span className="text-yellow-400">未設定</span>
              )}
            </button>
          );
        },
      }),
    ],
    [
      sortField,
      sortOrder,
      onSortChange,
      onAssignClick,
      getGrantExpenditureValue,
      handleGrantExpenditureFlagChange,
    ],
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
