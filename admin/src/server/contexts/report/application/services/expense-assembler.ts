/**
 * Expense Assembler
 *
 * AppService that assembles ExpenseData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import {
  convertToOfficeExpenseSection,
  convertToSuppliesExpenseSection,
  convertToUtilityExpenseSection,
} from "@/server/contexts/report/domain/services/expense-converter";
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

    const [utilityTransactions, suppliesTransactions, officeTransactions] =
      await Promise.all([
        this.repository.findUtilityExpenseTransactions(filters),
        this.repository.findSuppliesExpenseTransactions(filters),
        this.repository.findOfficeExpenseTransactions(filters),
      ]);

    return {
      utilityExpenses: convertToUtilityExpenseSection(utilityTransactions),
      suppliesExpenses: convertToSuppliesExpenseSection(suppliesTransactions),
      officeExpenses: convertToOfficeExpenseSection(officeTransactions),
    };
  }
}
