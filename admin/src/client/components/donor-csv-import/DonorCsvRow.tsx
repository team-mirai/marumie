import type { PreviewDonorCsvRow } from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import { DONOR_TYPE_LABELS } from "@/server/contexts/report/domain/models/donor";
import { TableCell, TableRow } from "@/client/components/ui";
import { cn, formatAmount, formatDate, resolveDonorCsvStatusBadge } from "@/client/lib";
import { CategoryPill } from "@/client/components/transactions/CategoryPill";

interface DonorCsvRowProps {
  row: PreviewDonorCsvRow;
}

/** 寄付者 CSV プレビューの 1 行。日付は YYYY.MM.DD、金額は Poppins 右寄せ、カテゴリは取引一覧と同じピル。 */
export default function DonorCsvRow({ row }: DonorCsvRowProps) {
  const badge = resolveDonorCsvStatusBadge(row.status);
  const transaction = row.transaction;

  return (
    <TableRow>
      <TableCell className="font-latin text-xs text-muted-foreground">{row.rowNumber}</TableCell>
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
      <TableCell className="font-latin text-xs text-muted-foreground">
        {row.transactionNo || "-"}
      </TableCell>
      <TableCell className="text-[13px] font-medium">{row.name || "-"}</TableCell>
      <TableCell className="text-[13px]">
        {row.donorType ? DONOR_TYPE_LABELS[row.donorType] : "-"}
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
        {row.address || "-"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.occupation || "-"}</TableCell>
      <TableCell className="font-latin text-[13px]">
        {transaction ? formatDate(transaction.transactionDate) : "-"}
      </TableCell>
      <TableCell>
        {transaction ? (
          <CategoryPill categoryKey={transaction.categoryKey} />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="font-latin text-right text-[13px] font-semibold">
        {transaction ? formatAmount(transaction.creditAmount) : "-"}
      </TableCell>
      <TableCell className="whitespace-normal align-top text-xs">
        {row.errors.length > 0 && (
          <ul className="list-inside list-disc text-destructive">
            {row.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        {transaction?.existingDonor && (
          <div className="mt-1 text-muted-foreground">
            既存: {transaction.existingDonor.name} (
            {DONOR_TYPE_LABELS[transaction.existingDonor.donorType]})
          </div>
        )}
        {row.matchingDonor && (
          <div className="mt-1 text-muted-foreground">一致: {row.matchingDonor.name}</div>
        )}
      </TableCell>
    </TableRow>
  );
}
