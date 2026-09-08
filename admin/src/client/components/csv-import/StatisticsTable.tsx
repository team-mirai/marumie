"use client";
import "client-only";

import type { PreviewMfCsvResult } from "@/server/contexts/data-import/presentation/types";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { cn, formatCurrency, resolvePreviewStatusBadge } from "@/client/lib";

type PreviewStatistics = PreviewMfCsvResult["statistics"];
type StatisticsRow = PreviewStatistics[PreviewTransaction["status"]];
type StatisticsColumn = keyof StatisticsRow;

interface StatisticsTableProps {
  statistics: PreviewStatistics;
}

const ROWS: PreviewTransaction["status"][] = ["insert", "update", "invalid", "skip"];
const COLUMNS: { key: StatisticsColumn; label: string }[] = [
  { key: "income", label: "収入" },
  { key: "expense", label: "支出" },
  { key: "offset_income", label: "収入（相殺）" },
  { key: "offset_expense", label: "支出（相殺）" },
];

/** 取り込み状態 × 取引種別ごとの件数・金額サマリ。 */
export default function StatisticsTable({ statistics }: StatisticsTableProps) {
  return (
    <div>
      <h3 className="text-[13px] font-bold text-foreground">取引種別別統計</h3>
      <div className="mt-2 max-w-[880px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">状態</TableHead>
              {COLUMNS.map((column) => (
                <TableHead key={column.key} className="text-right">
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((status) => {
              const badge = resolvePreviewStatusBadge(status);
              return (
                <TableRow key={status}>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block rounded-full border-[1.5px] px-3 py-[3px] text-[11px] font-bold leading-none tracking-[0.04em] whitespace-nowrap",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  </TableCell>
                  {COLUMNS.map((column) => {
                    const { count, amount } = statistics[status][column.key];
                    return (
                      <TableCell
                        key={column.key}
                        className="font-latin text-right text-[13px] text-foreground"
                      >
                        {count === 0 ? (
                          <span className="text-subtle-foreground">–</span>
                        ) : (
                          <>
                            <span className="font-semibold">{formatCurrency(amount)}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({count}件)
                            </span>
                          </>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
