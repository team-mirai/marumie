import type { ReactNode } from "react";
import { TableCell, TableHead } from "@/client/components/ui";
import { cn, formatCurrency, formatDate } from "@/client/lib";

/**
 * 報告書プレビューの明細テーブルで共通利用するセル群。
 * 数字・日付は Poppins（font-latin）、金額は右寄せ、日付は YYYY.MM.DD（ハンドオフ準拠）。
 */

interface CellProps {
  className?: string;
}

export function RowNumberHead({ className }: CellProps) {
  return <TableHead className={cn("w-[50px]", className)}>行番号</TableHead>;
}

export function AmountHead({ className }: CellProps) {
  return <TableHead className={cn("w-[100px] text-right", className)}>金額</TableHead>;
}

export function DateHead({ className }: CellProps) {
  return <TableHead className={cn("w-[100px]", className)}>年月日</TableHead>;
}

export function RowNumberCell({ value }: { value: string }) {
  return <TableCell className="font-latin text-xs text-muted-foreground">{value}</TableCell>;
}

export function AmountCell({ value }: { value: number }) {
  return (
    <TableCell className="text-right font-latin text-[13px] font-semibold">
      {formatCurrency(value)}
    </TableCell>
  );
}

export function DateCell({ value }: { value: Date | null | undefined }) {
  return <TableCell className="font-latin text-[13px]">{value ? formatDate(value) : ""}</TableCell>;
}

export function EmptyMessage({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
