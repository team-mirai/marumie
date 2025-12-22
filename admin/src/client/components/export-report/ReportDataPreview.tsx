"use client";

import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import { DonationSection } from "./sections/DonationSection";
import { IncomeSection } from "./sections/IncomeSection";
import { RegularExpenseSection } from "./sections/RegularExpenseSection";
import { PoliticalActivityExpenseSection } from "./sections/PoliticalActivityExpenseSection";

interface ReportDataPreviewProps {
  reportData: ReportData;
}

export function ReportDataPreview({ reportData }: ReportDataPreviewProps) {
  const { donations, income, expenses } = reportData;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-white mb-1">表形式プレビュー</h2>
        <p className="text-sm text-muted-foreground">報告書データを表形式で確認できます。</p>
      </div>

      <div className="space-y-8">
        {/* 収入の部 */}
        <DonationSection personalDonations={donations.personalDonations} />

        <IncomeSection
          businessIncome={income.businessIncome}
          loanIncome={income.loanIncome}
          grantIncome={income.grantIncome}
          otherIncome={income.otherIncome}
        />

        {/* 支出の部 */}
        <RegularExpenseSection
          utilityExpenses={expenses.utilityExpenses}
          suppliesExpenses={expenses.suppliesExpenses}
          officeExpenses={expenses.officeExpenses}
        />

        <PoliticalActivityExpenseSection
          organizationExpenses={expenses.organizationExpenses}
          electionExpenses={expenses.electionExpenses}
          publicationExpenses={expenses.publicationExpenses}
          advertisingExpenses={expenses.advertisingExpenses}
          fundraisingPartyExpenses={expenses.fundraisingPartyExpenses}
          otherBusinessExpenses={expenses.otherBusinessExpenses}
          researchExpenses={expenses.researchExpenses}
          donationGrantExpenses={expenses.donationGrantExpenses}
          otherPoliticalExpenses={expenses.otherPoliticalExpenses}
        />
      </div>
    </div>
  );
}
