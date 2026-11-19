import { ExpenseTable } from "@/client/components/export-report/sections/ExpenseTable";
import { EmptyMessage } from "@/client/components/export-report/sections/ReportTableCells";
import { SectionHeading } from "@/client/components/export-report/sections/SectionHeading";
import { SectionWrapper } from "@/client/components/export-report/sections/SectionWrapper";
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
      {hasData && sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div key={section.himoku || index}>
              {section.himoku && (
                <h4 className="mb-2 text-[13px] font-bold text-muted-foreground">
                  費目: {section.himoku}
                </h4>
              )}
              <ExpenseTable rows={section.rows} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyMessage>データなし</EmptyMessage>
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
    <div className="space-y-4">
      <SectionHeading>
        政治活動費{" "}
        <span className="font-latin text-sm font-semibold text-subtle-foreground">
          SYUUSHI07_15
        </span>
      </SectionHeading>

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
