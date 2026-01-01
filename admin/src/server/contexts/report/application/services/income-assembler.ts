/**
 * Income Assembler
 *
 * AppService that assembles IncomeData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import {
  BusinessIncomeSection,
  GrantIncomeSection,
  LoanIncomeSection,
  OtherIncomeSection,
} from "@/server/contexts/report/domain/models/income-transaction";
import type { IncomeData } from "@/server/contexts/report/domain/models/report-data";

// ============================================================
// Types
// ============================================================

export interface IncomeAssemblerInput {
  politicalOrganizationId: string;
  financialYear: number;
}

// ============================================================
// Assembler
// ============================================================

export class IncomeAssembler {
  constructor(private repository: IReportTransactionRepository) {}

  async assemble(input: IncomeAssemblerInput): Promise<IncomeData> {
    const filters = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    };

    const [businessTransactions, loanTransactions, grantTransactions, otherTransactions] =
      await Promise.all([
        this.repository.findBusinessIncomeTransactions(filters),
        this.repository.findLoanIncomeTransactions(filters),
        this.repository.findGrantIncomeTransactions(filters),
        this.repository.findOtherIncomeTransactions(filters),
      ]);

    return {
      businessIncome: BusinessIncomeSection.fromTransactions(businessTransactions),
      loanIncome: LoanIncomeSection.fromTransactions(loanTransactions),
      grantIncome: GrantIncomeSection.fromTransactions(grantTransactions),
      otherIncome: OtherIncomeSection.fromTransactions(otherTransactions),
    };
  }
}
