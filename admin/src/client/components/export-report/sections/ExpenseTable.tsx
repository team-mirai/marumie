import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import {
  AmountCell,
  AmountHead,
  DateCell,
  DateHead,
  EmptyMessage,
  RowNumberCell,
  RowNumberHead,
} from "@/client/components/export-report/sections/ReportTableCells";
import type { ExpenseRow } from "@/server/contexts/report/domain/models/expense-transaction";

interface ExpenseTableProps {
  rows: ExpenseRow[];
}

/** 経常経費・政治活動費で共通の支出明細テーブル（目的 / 金額 / 年月日 / 氏名 / 住所 / 備考） */
export function ExpenseTable({ rows }: ExpenseTableProps) {
  if (rows.length === 0) {
    return <EmptyMessage>5万円以上の明細はありません</EmptyMessage>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <RowNumberHead />
          <TableHead className="w-[200px]">目的</TableHead>
          <AmountHead />
          <DateHead />
          <TableHead className="w-[150px]">氏名</TableHead>
          <TableHead className="w-[200px]">住所</TableHead>
          <TableHead className="w-[150px]">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo}>
            <RowNumberCell value={row.ichirenNo} />
            <TableCell>{row.mokuteki}</TableCell>
            <AmountCell value={row.kingaku} />
            <DateCell value={row.dt} />
            <TableCell>{row.nm}</TableCell>
            <TableCell>{row.adr}</TableCell>
            <TableCell className="text-muted-foreground">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
