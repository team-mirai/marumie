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
  BusinessIncomeSection,
  BusinessIncomeRow,
  LoanIncomeSection,
  LoanIncomeRow,
  GrantIncomeSection,
  GrantIncomeRow,
  OtherIncomeSection,
  OtherIncomeRow,
} from "@/server/contexts/report/domain/models/income-transaction";

interface IncomeSectionProps {
  businessIncome: BusinessIncomeSection;
  loanIncome: LoanIncomeSection;
  grantIncome: GrantIncomeSection;
  otherIncome: OtherIncomeSection;
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

interface BusinessIncomeTableProps {
  rows: BusinessIncomeRow[];
}

function BusinessIncomeTable({ rows }: BusinessIncomeTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">明細はありません</p>;
  }

  return (
    <Table className="border-collapse border border-black">
      <TableHeader>
        <TableRow className="border border-black">
          <TableHead className="w-[50px] text-black border border-black">行番号</TableHead>
          <TableHead className="w-[250px] text-black border border-black">事業の種類</TableHead>
          <TableHead className="w-[100px] text-right text-black border border-black">
            金額
          </TableHead>
          <TableHead className="w-[200px] text-black border border-black">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo} className="border border-black">
            <TableCell className="text-black border border-black">{row.ichirenNo}</TableCell>
            <TableCell className="text-black border border-black">{row.gigyouSyurui}</TableCell>
            <TableCell className="text-right text-black border border-black">
              {formatCurrency(row.kingaku)}
            </TableCell>
            <TableCell className="text-black border border-black">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface LoanIncomeTableProps {
  rows: LoanIncomeRow[];
}

function LoanIncomeTable({ rows }: LoanIncomeTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">明細はありません</p>;
  }

  return (
    <Table className="border-collapse border border-black">
      <TableHeader>
        <TableRow className="border border-black">
          <TableHead className="w-[50px] text-black border border-black">行番号</TableHead>
          <TableHead className="w-[250px] text-black border border-black">借入先</TableHead>
          <TableHead className="w-[100px] text-right text-black border border-black">
            金額
          </TableHead>
          <TableHead className="w-[200px] text-black border border-black">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo} className="border border-black">
            <TableCell className="text-black border border-black">{row.ichirenNo}</TableCell>
            <TableCell className="text-black border border-black">{row.kariiresaki}</TableCell>
            <TableCell className="text-right text-black border border-black">
              {formatCurrency(row.kingaku)}
            </TableCell>
            <TableCell className="text-black border border-black">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface GrantIncomeTableProps {
  rows: GrantIncomeRow[];
}

function GrantIncomeTable({ rows }: GrantIncomeTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">明細はありません</p>;
  }

  return (
    <Table className="border-collapse border border-black">
      <TableHeader>
        <TableRow className="border border-black">
          <TableHead className="w-[50px] text-black border border-black">行番号</TableHead>
          <TableHead className="w-[200px] text-black border border-black">本支部名称</TableHead>
          <TableHead className="w-[100px] text-right text-black border border-black">
            金額
          </TableHead>
          <TableHead className="w-[100px] text-black border border-black">年月日</TableHead>
          <TableHead className="w-[200px] text-black border border-black">事務所所在地</TableHead>
          <TableHead className="w-[150px] text-black border border-black">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo} className="border border-black">
            <TableCell className="text-black border border-black">{row.ichirenNo}</TableCell>
            <TableCell className="text-black border border-black">{row.honsibuNm}</TableCell>
            <TableCell className="text-right text-black border border-black">
              {formatCurrency(row.kingaku)}
            </TableCell>
            <TableCell className="text-black border border-black">{formatDate(row.dt)}</TableCell>
            <TableCell className="text-black border border-black">{row.jimuAdr}</TableCell>
            <TableCell className="text-black border border-black">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface OtherIncomeTableProps {
  rows: OtherIncomeRow[];
}

function OtherIncomeTable({ rows }: OtherIncomeTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">10万円以上の明細はありません</p>;
  }

  return (
    <Table className="border-collapse border border-black">
      <TableHeader>
        <TableRow className="border border-black">
          <TableHead className="w-[50px] text-black border border-black">行番号</TableHead>
          <TableHead className="w-[250px] text-black border border-black">摘要</TableHead>
          <TableHead className="w-[100px] text-right text-black border border-black">
            金額
          </TableHead>
          <TableHead className="w-[200px] text-black border border-black">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo} className="border border-black">
            <TableCell className="text-black border border-black">{row.ichirenNo}</TableCell>
            <TableCell className="text-black border border-black">{row.tekiyou}</TableCell>
            <TableCell className="text-right text-black border border-black">
              {formatCurrency(row.kingaku)}
            </TableCell>
            <TableCell className="text-black border border-black">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function IncomeSection({
  businessIncome,
  loanIncome,
  grantIncome,
  otherIncome,
}: IncomeSectionProps) {
  const hasBusinessIncomeData = businessIncome.rows.length > 0 || businessIncome.totalAmount > 0;
  const hasLoanIncomeData = loanIncome.rows.length > 0 || loanIncome.totalAmount > 0;
  const hasGrantIncomeData = grantIncome.rows.length > 0 || grantIncome.totalAmount > 0;
  const hasOtherIncomeData = otherIncome.rows.length > 0 || otherIncome.totalAmount > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">収入の部</h2>

      <SectionWrapper
        title="事業による収入"
        formId="SYUUSHI07_03"
        totalAmount={businessIncome.totalAmount}
        isEmpty={!hasBusinessIncomeData}
      >
        {hasBusinessIncomeData ? (
          <BusinessIncomeTable rows={businessIncome.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>

      <SectionWrapper
        title="借入金"
        formId="SYUUSHI07_04"
        totalAmount={loanIncome.totalAmount}
        isEmpty={!hasLoanIncomeData}
      >
        {hasLoanIncomeData ? (
          <LoanIncomeTable rows={loanIncome.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>

      <SectionWrapper
        title="本部又は支部から供与された交付金"
        formId="SYUUSHI07_05"
        totalAmount={grantIncome.totalAmount}
        isEmpty={!hasGrantIncomeData}
      >
        {hasGrantIncomeData ? (
          <GrantIncomeTable rows={grantIncome.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>

      <SectionWrapper
        title="その他の収入"
        formId="SYUUSHI07_06"
        totalAmount={otherIncome.totalAmount}
        underThresholdAmount={otherIncome.underThresholdAmount}
        isEmpty={!hasOtherIncomeData}
      >
        {hasOtherIncomeData ? (
          <OtherIncomeTable rows={otherIncome.rows} />
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )}
      </SectionWrapper>
    </div>
  );
}
