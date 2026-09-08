import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { SectionHeading } from "@/client/components/export-report/sections/SectionHeading";
import { SectionWrapper } from "@/client/components/export-report/sections/SectionWrapper";
import {
  AmountCell,
  AmountHead,
  DateCell,
  DateHead,
  EmptyMessage,
  RowNumberCell,
  RowNumberHead,
} from "@/client/components/export-report/sections/ReportTableCells";
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

interface BusinessIncomeTableProps {
  rows: BusinessIncomeRow[];
}

function BusinessIncomeTable({ rows }: BusinessIncomeTableProps) {
  if (rows.length === 0) {
    return <EmptyMessage>明細はありません</EmptyMessage>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <RowNumberHead />
          <TableHead className="w-[250px]">事業の種類</TableHead>
          <AmountHead />
          <TableHead className="w-[200px]">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo}>
            <RowNumberCell value={row.ichirenNo} />
            <TableCell>{row.gigyouSyurui}</TableCell>
            <AmountCell value={row.kingaku} />
            <TableCell className="text-muted-foreground">{row.bikou || ""}</TableCell>
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
    return <EmptyMessage>明細はありません</EmptyMessage>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <RowNumberHead />
          <TableHead className="w-[250px]">借入先</TableHead>
          <AmountHead />
          <TableHead className="w-[200px]">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo}>
            <RowNumberCell value={row.ichirenNo} />
            <TableCell>{row.kariiresaki}</TableCell>
            <AmountCell value={row.kingaku} />
            <TableCell className="text-muted-foreground">{row.bikou || ""}</TableCell>
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
    return <EmptyMessage>明細はありません</EmptyMessage>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <RowNumberHead />
          <TableHead className="w-[200px]">本支部名称</TableHead>
          <AmountHead />
          <DateHead />
          <TableHead className="w-[200px]">事務所所在地</TableHead>
          <TableHead className="w-[150px]">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo}>
            <RowNumberCell value={row.ichirenNo} />
            <TableCell>{row.honsibuNm}</TableCell>
            <AmountCell value={row.kingaku} />
            <DateCell value={row.dt} />
            <TableCell>{row.jimuAdr}</TableCell>
            <TableCell className="text-muted-foreground">{row.bikou || ""}</TableCell>
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
    return <EmptyMessage>10万円以上の明細はありません</EmptyMessage>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <RowNumberHead />
          <TableHead className="w-[250px]">摘要</TableHead>
          <AmountHead />
          <TableHead className="w-[200px]">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo}>
            <RowNumberCell value={row.ichirenNo} />
            <TableCell>{row.tekiyou}</TableCell>
            <AmountCell value={row.kingaku} />
            <TableCell className="text-muted-foreground">{row.bikou || ""}</TableCell>
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
    <div className="space-y-4">
      <SectionHeading>収入の部</SectionHeading>

      <SectionWrapper
        title="事業による収入"
        formId="SYUUSHI07_03"
        totalAmount={businessIncome.totalAmount}
        isEmpty={!hasBusinessIncomeData}
      >
        {hasBusinessIncomeData ? (
          <BusinessIncomeTable rows={businessIncome.rows} />
        ) : (
          <EmptyMessage>データなし</EmptyMessage>
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
          <EmptyMessage>データなし</EmptyMessage>
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
          <EmptyMessage>データなし</EmptyMessage>
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
          <EmptyMessage>データなし</EmptyMessage>
        )}
      </SectionWrapper>
    </div>
  );
}
