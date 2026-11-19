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
  PersonalDonationSection,
  PersonalDonationRow,
} from "@/server/contexts/report/domain/models/donation-transaction";

interface DonationSectionProps {
  personalDonations: PersonalDonationSection;
}

interface PersonalDonationTableProps {
  rows: PersonalDonationRow[];
}

function PersonalDonationTable({ rows }: PersonalDonationTableProps) {
  if (rows.length === 0) {
    return <EmptyMessage>明細はありません</EmptyMessage>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <RowNumberHead />
          <TableHead className="w-[150px]">寄附者氏名</TableHead>
          <AmountHead />
          <DateHead />
          <TableHead className="w-[200px]">住所</TableHead>
          <TableHead className="w-[100px]">職業</TableHead>
          <TableHead className="w-[150px]">備考</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ichirenNo}>
            <RowNumberCell value={row.ichirenNo} />
            <TableCell>{row.kifusyaNm}</TableCell>
            <AmountCell value={row.kingaku} />
            <DateCell value={row.dt} />
            <TableCell>{row.adr}</TableCell>
            <TableCell>{row.syokugyo}</TableCell>
            <TableCell className="text-muted-foreground">{row.bikou || ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DonationSection({ personalDonations }: DonationSectionProps) {
  const hasPersonalDonationData =
    personalDonations.rows.length > 0 || personalDonations.totalAmount > 0;

  return (
    <div className="space-y-4">
      <SectionHeading>
        寄附{" "}
        <span className="font-latin text-sm font-semibold text-subtle-foreground">
          SYUUSHI07_07
        </span>
      </SectionHeading>

      <SectionWrapper
        title="個人からの寄附"
        formId="KUBUN1"
        totalAmount={personalDonations.totalAmount}
        underThresholdAmount={personalDonations.sonotaGk}
        thresholdLabel="その他の寄附"
        isEmpty={!hasPersonalDonationData}
      >
        {hasPersonalDonationData ? (
          <PersonalDonationTable rows={personalDonations.rows} />
        ) : (
          <EmptyMessage>データなし</EmptyMessage>
        )}
      </SectionWrapper>
    </div>
  );
}
