"use client";
import "client-only";

import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import { TableCell, TableRow } from "@/client/components/ui";
import { cn, formatAmount, formatDate, resolvePreviewStatusBadge } from "@/client/lib";
import { CategoryPill } from "@/client/components/transactions/CategoryPill";
import { TransactionTypeBadge } from "@/client/components/transactions/TransactionTypeBadge";

interface TransactionRowProps {
  record: PreviewTransaction;
}

/** 取り込みプレビューの 1 行。種別バッジ・カテゴリピル・日付・金額の見た目は取引一覧と同一。 */
export default function TransactionRow({ record }: TransactionRowProps) {
  const status = resolvePreviewStatusBadge(record.status);

  return (
    <TableRow>
      <TableCell className="whitespace-normal align-top">
        <span
          className={cn(
            "inline-block rounded-full border-[1.5px] px-3 py-[3px] text-[11px] font-bold leading-none tracking-[0.04em] whitespace-nowrap",
            status.className,
          )}
        >
          {status.label}
        </span>
        {record.errors.length > 0 && (
          <div className={cn("mt-1.5 max-w-[240px] text-xs", status.messageClassName)}>
            {record.errors.map((error, errorIndex) => (
              <div key={`error-${errorIndex}-${error}`}>{error}</div>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="font-latin text-[13px]">
        {formatDate(record.transaction_date)}
      </TableCell>
      <TableCell className="text-[13px]">
        {record.debit_account}
        {record.debit_sub_account && (
          <div className="text-xs text-muted-foreground">{record.debit_sub_account}</div>
        )}
      </TableCell>
      <TableCell className="font-latin text-right text-[13px] font-semibold">
        {record.debit_amount ? formatAmount(record.debit_amount) : "-"}
      </TableCell>
      <TableCell className="text-[13px]">
        {record.credit_account}
        {record.credit_sub_account && (
          <div className="text-xs text-muted-foreground">{record.credit_sub_account}</div>
        )}
      </TableCell>
      <TableCell className="font-latin text-right text-[13px] font-semibold">
        {record.credit_amount ? formatAmount(record.credit_amount) : "-"}
      </TableCell>
      <TableCell>
        {record.transaction_type ? (
          <TransactionTypeBadge type={record.transaction_type} />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <CategoryPill transaction={record} />
      </TableCell>
      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
        <div className="truncate" title={record.description || undefined}>
          {record.description || "-"}
        </div>
        {record.label && (
          <div className="mt-1 truncate" title={record.label}>
            ラベル: {record.label}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
