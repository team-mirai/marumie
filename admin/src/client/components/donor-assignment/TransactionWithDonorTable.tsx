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
import { cn, formatDate, formatAmount } from "@/client/lib";
import {
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { CategoryPill } from "@/client/components/transactions/CategoryPill";
import { DonorTypeBadge } from "@/client/components/donors/DonorTypeBadge";
import { AssignmentStatusBadge } from "@/client/components/assignment/AssignmentStatusBadge";
import { SortableColumnHeader } from "@/client/components/assignment/SortableColumnHeader";

type SortField = "transactionDate" | "debitAmount" | "categoryKey";

interface TransactionWithDonorTableProps {
  transactions: TransactionWithDonor[];
  sortField: SortField;
  sortOrder: "asc" | "desc";
  onSortChange: (field: SortField) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onAssignClick: (transaction: TransactionWithDonor) => void;
}

const columnHelper = createColumnHelper<TransactionWithDonor>();

/**
 * 寄付者紐付け対象の取引一覧。取引先紐付けと同じ語彙
 * （ヘッダー下黒 1.5px・行 #E5E5E5・日付 `YYYY.MM.DD`・金額 Poppins 右寄せ・状態ピル）。
 */
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
        cell: (info) => (
          <span className="font-latin text-[13px] font-semibold">
            {formatAmount(info.getValue())}
          </span>
        ),
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
      columnHelper.accessor("donor", {
        header: "寄付者",
        cell: (info) => {
          const transaction = info.row.original;
          const donor = transaction.donor;
          return (
            <div className="flex items-center gap-3">
              <AssignmentStatusBadge assigned={donor !== null} />
              {donor ? (
                <div className="min-w-0 max-w-[260px]">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {donor.name}
                    </p>
                    <DonorTypeBadge donorType={donor.donorType} />
                  </div>
                  {donor.address && (
                    <p className="truncate text-xs text-muted-foreground">{donor.address}</p>
                  )}
                </div>
              ) : null}
              <Button
                type="button"
                variant={donor ? "outline" : "default"}
                size="xs"
                onClick={() => onAssignClick(transaction)}
              >
                {donor ? "変更" : "紐付け"}
              </Button>
            </div>
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
      <div className="py-10 text-center">
        <p className="text-muted-foreground">該当する取引がありません</p>
      </div>
    );
  }

  return (
    <Table className="min-w-[880px]">
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
