/**
 * Income Assembler
 *
 * AppService that assembles IncomeData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/interfaces/report-transaction-repository.interface";
import {
  convertToBusinessIncomeSection,
  convertToGrantIncomeSection,
  convertToLoanIncomeSection,
  convertToOtherIncomeSection,
} from "@/server/contexts/report/domain/services/income-converter";
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

    const [
      businessTransactions,
      loanTransactions,
      grantTransactions,
      otherTransactions,
    ] = await Promise.all([
      this.repository.findBusinessIncomeTransactions(filters),
      this.repository.findLoanIncomeTransactions(filters),
      this.repository.findGrantIncomeTransactions(filters),
      this.repository.findOtherIncomeTransactions(filters),
    ]);

    return {
      businessIncome: convertToBusinessIncomeSection(businessTransactions),
      loanIncome: convertToLoanIncomeSection(loanTransactions),
      grantIncome: convertToGrantIncomeSection(grantTransactions),
      otherIncome: convertToOtherIncomeSection(otherTransactions),
    };
  }
}
