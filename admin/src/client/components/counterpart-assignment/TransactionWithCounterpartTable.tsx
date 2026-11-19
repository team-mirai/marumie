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
import { Question } from "@phosphor-icons/react/dist/ssr";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { cn, formatDate, formatAmount } from "@/client/lib";
import {
  Button,
  Checkbox,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui";
import { CategoryPill } from "@/client/components/transactions/CategoryPill";
import { AssignmentStatusBadge } from "@/client/components/assignment/AssignmentStatusBadge";
import { SortableColumnHeader } from "@/client/components/assignment/SortableColumnHeader";
import { updateGrantExpenditureFlagAction } from "@/server/contexts/report/presentation/actions/update-grant-expenditure-flag";

type SortField = "transactionDate" | "debitAmount" | "categoryKey";

interface TransactionWithCounterpartTableProps {
  transactions: TransactionWithCounterpart[];
  sortField: SortField;
  sortOrder: "asc" | "desc";
  onSortChange: (field: SortField) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onAssignClick: (transaction: TransactionWithCounterpart) => void;
}

const columnHelper = createColumnHelper<TransactionWithCounterpart>();

/**
 * 取引先紐付け対象の取引一覧。罫線は取引一覧と同じ（ヘッダー下黒 1.5px・行 #E5E5E5）、
 * 日付は `YYYY.MM.DD`、金額は Poppins 右寄せ、紐付け状態はピルバッジで示す。
 */
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
          <Checkbox
            aria-label="すべての取引を選択"
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="この取引を選択"
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          />
        ),
      }),
      columnHelper.accessor("transactionDate", {
        header: () => (
          <SortableColumnHeader
            label="日付"
            active={sortField === "transactionDate"}
            order={sortOrder}
            onClick={() => onSortChange("transactionDate")}
          />
        ),
        cell: (info) => (
          <span className="font-latin text-[13px]">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("debitAmount", {
        header: () => (
          <SortableColumnHeader
            label="金額"
            active={sortField === "debitAmount"}
            order={sortOrder}
            onClick={() => onSortChange("debitAmount")}
            align="right"
          />
        ),
        cell: (info) => {
          const transaction = info.row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              {transaction.requiresCounterpart && (
                <span className="inline-block rounded-full border-[1.5px] border-destructive bg-card px-3 py-[3px] text-[11px] font-bold leading-none whitespace-nowrap text-destructive">
                  取引先必須
                </span>
              )}
              <span className="font-latin text-[13px] font-semibold">
                {formatAmount(info.getValue())}
              </span>
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
                <span className="cursor-help text-subtle-foreground transition-colors duration-150 ease-out hover:text-foreground">
                  <Question className="size-4" aria-label="交付金フラグの説明" />
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
              aria-label="交付金フラグ"
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
          <SortableColumnHeader
            label="カテゴリ"
            active={sortField === "categoryKey"}
            order={sortOrder}
            onClick={() => onSortChange("categoryKey")}
          />
        ),
        cell: (info) => <CategoryPill categoryKey={info.getValue()} />,
      }),
      columnHelper.accessor("friendlyCategory", {
        header: "詳細区分",
        cell: (info) => (
          <span className="text-[13px] text-muted-foreground">{info.getValue() || "-"}</span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "摘要",
        cell: (info) => (
          <div
            className="max-w-[240px] truncate text-xs text-muted-foreground"
            title={info.getValue() || undefined}
          >
            {info.getValue() || "-"}
          </div>
        ),
      }),
      columnHelper.accessor("counterpart", {
        header: "取引先",
        cell: (info) => {
          const transaction = info.row.original;
          const counterpart = transaction.counterpart;
          return (
            <div className="flex items-center gap-3">
              <AssignmentStatusBadge assigned={counterpart !== null} />
              {counterpart ? (
                <div className="min-w-0 max-w-[220px]">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {counterpart.name}
                  </p>
                  {counterpart.address && (
                    <p className="truncate text-xs text-muted-foreground">{counterpart.address}</p>
                  )}
                </div>
              ) : null}
              <Button
                type="button"
                variant={counterpart ? "outline" : "default"}
                size="xs"
                onClick={() => onAssignClick(transaction)}
              >
                {counterpart ? "変更" : "紐付け"}
              </Button>
            </div>
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
      <div className="py-10 text-center">
        <p className="text-muted-foreground">該当する取引がありません</p>
      </div>
    );
  }

  return (
    <Table className="min-w-[960px]">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(header.column.id === "debitAmount" && "text-right")}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn("text-foreground", cell.column.id === "debitAmount" && "text-right")}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
