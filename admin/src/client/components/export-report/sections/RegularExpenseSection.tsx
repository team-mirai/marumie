import { ExpenseTable } from "@/client/components/export-report/sections/ExpenseTable";
import { EmptyMessage } from "@/client/components/export-report/sections/ReportTableCells";
import { SectionHeading } from "@/client/components/export-report/sections/SectionHeading";
import { SectionWrapper } from "@/client/components/export-report/sections/SectionWrapper";
import type {
  UtilityExpenseSection,
  SuppliesExpenseSection,
  OfficeExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";

interface RegularExpenseSectionProps {
  utilityExpenses: UtilityExpenseSection;
  suppliesExpenses: SuppliesExpenseSection;
  officeExpenses: OfficeExpenseSection;
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
    <div className="space-y-4">
      <SectionHeading>
        経常経費{" "}
        <span className="font-latin text-sm font-semibold text-subtle-foreground">
          SYUUSHI07_14
        </span>
      </SectionHeading>

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
          <EmptyMessage>データなし</EmptyMessage>
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
          <EmptyMessage>データなし</EmptyMessage>
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
          <EmptyMessage>データなし</EmptyMessage>
        )}
      </SectionWrapper>
    </div>
  );
}
