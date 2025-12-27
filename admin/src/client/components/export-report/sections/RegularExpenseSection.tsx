import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { SectionWrapper } from "./SectionWrapper";
import type {
  UtilityExpenseSection,
  SuppliesExpenseSection,
  OfficeExpenseSection,
  ExpenseRow,
} from "@/server/contexts/report/domain/models/expense-transaction";

interface RegularExpenseSectionProps {
  utilityExpenses: UtilityExpenseSection;
  suppliesExpenses: SuppliesExpenseSection;
  officeExpenses: OfficeExpenseSection;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}/${month}/${day}`;
}

interface ExpenseTableProps {
  rows: ExpenseRow[];
}

function ExpenseTable({ rows }: ExpenseTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">10万円以上の明細はありません</p>;
  }

  return (
    <Table className="border-collapse border border-black">
      <TableHeader>
        <TableRow className="border border-black">
          <TableHead className="w-[50px] text-black border border-black">行番号</TableHead>
          <TableHead className="w-[200px] text-black border border-black">目的</TableHead>
          <TableHead className="w-[100px] text-right text-black border border-black">
            金額
          </TableHead>
          <TableHead className="w-[100px] text-black border border-black">年月日</TableHead>
          <TableHead className="w-[150px] text-black border border-black">氏名</TableHead>
          <TableHead className="w-[200px] text-black border border-black">住所</TableHead>
          <TableHead className="w-[150px] text-black border border-black">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo} className="border border-black">
            <TableCell className="text-black border border-black">{row.ichirenNo}</TableCell>
            <TableCell className="text-black border border-black">{row.mokuteki}</TableCell>
            <TableCell className="text-right text-black border border-black">
              {formatCurrency(row.kingaku)}
            </TableCell>
            <TableCell className="text-black border border-black">{formatDate(row.dt)}</TableCell>
            <TableCell className="text-black border border-black">{row.nm}</TableCell>
            <TableCell className="text-black border border-black">{row.adr}</TableCell>
            <TableCell className="text-black border border-black">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RegularExpenseSection({
  utilityExpenses,
  suppliesExpenses,
  officeExpenses,
}: RegularExpenseSectionProps) {
  const hasUtilityData = utilityExpenses.rows.length > 0 || utilityExpenses.totalAmount > 0;
  const hasSuppliesData = suppliesExpenses.rows.length > 0 || suppliesExpenses.totalAmount > 0;
  const hasOfficeData = officeExpenses.rows.length > 0 || officeExpenses.totalAmount > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">経常経費 (SYUUSHI07_14)</h2>

      <SectionWrapper
        title="光熱水費"
        formId="KUBUN1"
        totalAmount={utilityExpenses.totalAmount}
        underThresholdAmount={utilityExpenses.underThresholdAmount}
        isEmpty={!hasUtilityData}
      >
        {hasUtilityData ? (
          <ExpenseTable rows={utilityExpenses.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>

      <SectionWrapper
        title="備品・消耗品費"
        formId="KUBUN2"
        totalAmount={suppliesExpenses.totalAmount}
        underThresholdAmount={suppliesExpenses.underThresholdAmount}
        isEmpty={!hasSuppliesData}
      >
        {hasSuppliesData ? (
          <ExpenseTable rows={suppliesExpenses.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>

      <SectionWrapper
        title="事務所費"
        formId="KUBUN3"
        totalAmount={officeExpenses.totalAmount}
        underThresholdAmount={officeExpenses.underThresholdAmount}
        isEmpty={!hasOfficeData}
      >
        {hasOfficeData ? (
          <ExpenseTable rows={officeExpenses.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>
    </div>
  );
}
