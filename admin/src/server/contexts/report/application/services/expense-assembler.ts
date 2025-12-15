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
  PublicationExpenseSection,
  ResearchExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";
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
    ]);

    return {
      // SYUUSHI07_14: 経常経費
      utilityExpenses: UtilityExpenseSection.fromTransactions(utilityTransactions),
      suppliesExpenses: SuppliesExpenseSection.fromTransactions(suppliesTransactions),
      officeExpenses: OfficeExpenseSection.fromTransactions(officeTransactions),
      // SYUUSHI07_15: 政治活動費（全9区分）
      organizationExpenses: OrganizationExpenseSection.fromTransactions(organizationTransactions),
      electionExpenses: ElectionExpenseSection.fromTransactions(electionTransactions),
      publicationExpenses: PublicationExpenseSection.fromTransactions(publicationTransactions),
      advertisingExpenses: AdvertisingExpenseSection.fromTransactions(advertisingTransactions),
      fundraisingPartyExpenses: FundraisingPartyExpenseSection.fromTransactions(
        fundraisingPartyTransactions,
      ),
      otherBusinessExpenses:
        OtherBusinessExpenseSection.fromTransactions(otherBusinessTransactions),
      researchExpenses: ResearchExpenseSection.fromTransactions(researchTransactions),
      donationGrantExpenses:
        DonationGrantExpenseSection.fromTransactions(donationGrantTransactions),
      otherPoliticalExpenses: OtherPoliticalExpenseSection.fromTransactions(
        otherPoliticalTransactions,
      ),
    };
  }
}
