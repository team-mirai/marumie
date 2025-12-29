/**
 * Expense Assembler
 *
 * AppService that assembles ExpenseData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import {
  AdvertisingExpenseSection,
  DonationGrantExpenseSection,
  ElectionExpenseSection,
  FundraisingPartyExpenseSection,
  OfficeExpenseSection,
  OrganizationExpenseSection,
  OtherBusinessExpenseSection,
  OtherPoliticalExpenseSection,
  PersonnelExpenseSection,
  PublicationExpenseSection,
  ResearchExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";
import { GrantExpenditureSection } from "@/server/contexts/report/domain/models/grant-expenditure";
import type { ExpenseData } from "@/server/contexts/report/domain/models/report-data";

// ============================================================
// Types
// ============================================================

export interface ExpenseAssemblerInput {
  politicalOrganizationId: string;
  financialYear: number;
}

// ============================================================
// Assembler
// ============================================================

export class ExpenseAssembler {
  constructor(private repository: IReportTransactionRepository) {}

  async assemble(input: ExpenseAssemblerInput): Promise<ExpenseData> {
    const filters = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    };

    const [
      utilityTransactions,
      suppliesTransactions,
      officeTransactions,
      organizationTransactions,
      electionTransactions,
      publicationTransactions,
      advertisingTransactions,
      fundraisingPartyTransactions,
      otherBusinessTransactions,
      researchTransactions,
      donationGrantTransactions,
      otherPoliticalTransactions,
      personnelTransactions,
    ] = await Promise.all([
      this.repository.findUtilityExpenseTransactions(filters),
      this.repository.findSuppliesExpenseTransactions(filters),
      this.repository.findOfficeExpenseTransactions(filters),
      this.repository.findOrganizationExpenseTransactions(filters),
      this.repository.findElectionExpenseTransactions(filters),
      this.repository.findPublicationExpenseTransactions(filters),
      this.repository.findAdvertisingExpenseTransactions(filters),
      this.repository.findFundraisingPartyExpenseTransactions(filters),
      this.repository.findOtherBusinessExpenseTransactions(filters),
      this.repository.findResearchExpenseTransactions(filters),
      this.repository.findDonationGrantExpenseTransactions(filters),
      this.repository.findOtherPoliticalExpenseTransactions(filters),
      this.repository.findPersonnelExpenseTransactions(filters),
    ]);

    // Build expense sections
    const utilityExpenses = UtilityExpenseSection.fromTransactions(utilityTransactions);
    const suppliesExpenses = SuppliesExpenseSection.fromTransactions(suppliesTransactions);
    const officeExpenses = OfficeExpenseSection.fromTransactions(officeTransactions);
    const organizationExpenses =
      OrganizationExpenseSection.fromTransactions(organizationTransactions);
    const electionExpenses = ElectionExpenseSection.fromTransactions(electionTransactions);
    const publicationExpenses = PublicationExpenseSection.fromTransactions(publicationTransactions);
    const advertisingExpenses = AdvertisingExpenseSection.fromTransactions(advertisingTransactions);
    const fundraisingPartyExpenses = FundraisingPartyExpenseSection.fromTransactions(
      fundraisingPartyTransactions,
    );
    const otherBusinessExpenses =
      OtherBusinessExpenseSection.fromTransactions(otherBusinessTransactions);
    const researchExpenses = ResearchExpenseSection.fromTransactions(researchTransactions);
    const donationGrantExpenses =
      DonationGrantExpenseSection.fromTransactions(donationGrantTransactions);
    const otherPoliticalExpenses = OtherPoliticalExpenseSection.fromTransactions(
      otherPoliticalTransactions,
    );

    // Build Sheet 16 (SYUUSHI07_16) from all expense sections with koufukin flag
    const grantExpenditures = GrantExpenditureSection.fromExpenseSections({
      utilityExpenses,
      suppliesExpenses,
      officeExpenses,
      organizationExpenses,
      electionExpenses,
      publicationExpenses,
      advertisingExpenses,
      fundraisingPartyExpenses,
      otherBusinessExpenses,
      researchExpenses,
      donationGrantExpenses,
      otherPoliticalExpenses,
    });

    return {
      // SYUUSHI07_13: 人件費（シート14には明細を出力しないが、シート13の総括表に必要）
      personnelExpenses: PersonnelExpenseSection.fromTransactions(personnelTransactions),
      // SYUUSHI07_14: 経常経費
      utilityExpenses,
      suppliesExpenses,
      officeExpenses,
      // SYUUSHI07_15: 政治活動費（全9区分）
      organizationExpenses,
      electionExpenses,
      publicationExpenses,
      advertisingExpenses,
      fundraisingPartyExpenses,
      otherBusinessExpenses,
      researchExpenses,
      donationGrantExpenses,
      otherPoliticalExpenses,
      // SYUUSHI07_16: 本部又は支部に対する交付金の支出
      grantExpenditures,
    };
  }
}
