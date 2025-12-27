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
  OrganizationExpenseSection,
  ElectionExpenseSection,
  PublicationExpenseSection,
  AdvertisingExpenseSection,
  FundraisingPartyExpenseSection,
  OtherBusinessExpenseSection,
  ResearchExpenseSection,
  DonationGrantExpenseSection,
  OtherPoliticalExpenseSection,
  PoliticalActivityExpenseRow,
} from "@/server/contexts/report/domain/models/expense-transaction";

interface PoliticalActivityExpenseSectionProps {
  organizationExpenses: OrganizationExpenseSection;
  electionExpenses: ElectionExpenseSection;
  publicationExpenses: PublicationExpenseSection;
  advertisingExpenses: AdvertisingExpenseSection;
  fundraisingPartyExpenses: FundraisingPartyExpenseSection;
  otherBusinessExpenses: OtherBusinessExpenseSection;
  researchExpenses: ResearchExpenseSection;
  donationGrantExpenses: DonationGrantExpenseSection;
  otherPoliticalExpenses: OtherPoliticalExpenseSection;
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

interface PoliticalActivityExpenseTableProps {
  rows: PoliticalActivityExpenseRow[];
}

function PoliticalActivityExpenseTable({ rows }: PoliticalActivityExpenseTableProps) {
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">5万円以上の明細はありません</p>;
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

interface ExpenseSubSectionProps {
  title: string;
  formId: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

function ExpenseSubSection({
  title,
  formId,
  totalAmount,
  underThresholdAmount,
  rows,
}: ExpenseSubSectionProps) {
  const hasData = rows.length > 0 || totalAmount > 0;

  return (
    <SectionWrapper
      title={title}
      formId={formId}
      totalAmount={totalAmount}
      underThresholdAmount={underThresholdAmount}
      thresholdLabel="5万円未満の合計"
      isEmpty={!hasData}
    >
      {hasData ? (
        <PoliticalActivityExpenseTable rows={rows} />
      ) : (
        <p className="text-gray-500 text-sm">データなし</p>
      )}
    </SectionWrapper>
  );
}

export function PoliticalActivityExpenseSection({
  organizationExpenses,
  electionExpenses,
  publicationExpenses,
  advertisingExpenses,
  fundraisingPartyExpenses,
  otherBusinessExpenses,
  researchExpenses,
  donationGrantExpenses,
  otherPoliticalExpenses,
}: PoliticalActivityExpenseSectionProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">政治活動費 (SYUUSHI07_15)</h2>

      <ExpenseSubSection
        title="組織活動費"
        formId="KUBUN1"
        totalAmount={organizationExpenses.totalAmount}
        underThresholdAmount={organizationExpenses.underThresholdAmount}
        rows={organizationExpenses.rows}
      />

      <ExpenseSubSection
        title="選挙関係費"
        formId="KUBUN2"
        totalAmount={electionExpenses.totalAmount}
        underThresholdAmount={electionExpenses.underThresholdAmount}
        rows={electionExpenses.rows}
      />

      <ExpenseSubSection
        title="機関紙誌の発行事業費"
        formId="KUBUN3"
        totalAmount={publicationExpenses.totalAmount}
        underThresholdAmount={publicationExpenses.underThresholdAmount}
        rows={publicationExpenses.rows}
      />

      <ExpenseSubSection
        title="宣伝事業費"
        formId="KUBUN4"
        totalAmount={advertisingExpenses.totalAmount}
        underThresholdAmount={advertisingExpenses.underThresholdAmount}
        rows={advertisingExpenses.rows}
      />

      <ExpenseSubSection
        title="政治資金パーティー開催事業費"
        formId="KUBUN5"
        totalAmount={fundraisingPartyExpenses.totalAmount}
        underThresholdAmount={fundraisingPartyExpenses.underThresholdAmount}
        rows={fundraisingPartyExpenses.rows}
      />

      <ExpenseSubSection
        title="その他の事業費"
        formId="KUBUN6"
        totalAmount={otherBusinessExpenses.totalAmount}
        underThresholdAmount={otherBusinessExpenses.underThresholdAmount}
        rows={otherBusinessExpenses.rows}
      />

      <ExpenseSubSection
        title="調査研究費"
        formId="KUBUN7"
        totalAmount={researchExpenses.totalAmount}
        underThresholdAmount={researchExpenses.underThresholdAmount}
        rows={researchExpenses.rows}
      />

      <ExpenseSubSection
        title="寄附・交付金"
        formId="KUBUN8"
        totalAmount={donationGrantExpenses.totalAmount}
        underThresholdAmount={donationGrantExpenses.underThresholdAmount}
        rows={donationGrantExpenses.rows}
      />

      <ExpenseSubSection
        title="その他の経費"
        formId="KUBUN9"
        totalAmount={otherPoliticalExpenses.totalAmount}
        underThresholdAmount={otherPoliticalExpenses.underThresholdAmount}
        rows={otherPoliticalExpenses.rows}
      />
    </div>
  );
}
