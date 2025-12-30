import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { formatCurrency } from "@/client/lib";
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
  organizationExpenses: OrganizationExpenseSection[];
  electionExpenses: ElectionExpenseSection[];
  publicationExpenses: PublicationExpenseSection[];
  advertisingExpenses: AdvertisingExpenseSection[];
  fundraisingPartyExpenses: FundraisingPartyExpenseSection[];
  otherBusinessExpenses: OtherBusinessExpenseSection[];
  researchExpenses: ResearchExpenseSection[];
  donationGrantExpenses: DonationGrantExpenseSection[];
  otherPoliticalExpenses: OtherPoliticalExpenseSection[];
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

interface ExpenseArraySubSectionProps {
  title: string;
  formId: string;
  sections: {
    himoku: string;
    totalAmount: number;
    underThresholdAmount: number;
    rows: PoliticalActivityExpenseRow[];
  }[];
}

function ExpenseArraySubSection({ title, formId, sections }: ExpenseArraySubSectionProps) {
  const totalAmount = sections.reduce((sum, s) => sum + s.totalAmount, 0);
  const underThresholdAmount = sections.reduce((sum, s) => sum + s.underThresholdAmount, 0);
  const allRows = sections.flatMap((s) => s.rows);
  const hasData = allRows.length > 0 || totalAmount > 0;

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
        sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={section.himoku || index}>
                {section.himoku && (
                  <h4 className="text-sm font-medium text-gray-300 mb-2">費目: {section.himoku}</h4>
                )}
                <PoliticalActivityExpenseTable rows={section.rows} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">データなし</p>
        )
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

      <ExpenseArraySubSection title="組織活動費" formId="KUBUN1" sections={organizationExpenses} />

      <ExpenseArraySubSection title="選挙関係費" formId="KUBUN2" sections={electionExpenses} />

      <ExpenseArraySubSection
        title="機関紙誌の発行事業費"
        formId="KUBUN3"
        sections={publicationExpenses}
      />

      <ExpenseArraySubSection title="宣伝事業費" formId="KUBUN4" sections={advertisingExpenses} />

      <ExpenseArraySubSection
        title="政治資金パーティー開催事業費"
        formId="KUBUN5"
        sections={fundraisingPartyExpenses}
      />

      <ExpenseArraySubSection
        title="その他の事業費"
        formId="KUBUN6"
        sections={otherBusinessExpenses}
      />

      <ExpenseArraySubSection title="調査研究費" formId="KUBUN7" sections={researchExpenses} />

      <ExpenseArraySubSection
        title="寄附・交付金"
        formId="KUBUN8"
        sections={donationGrantExpenses}
      />

      <ExpenseArraySubSection
        title="その他の経費"
        formId="KUBUN9"
        sections={otherPoliticalExpenses}
      />
    </div>
  );
}
