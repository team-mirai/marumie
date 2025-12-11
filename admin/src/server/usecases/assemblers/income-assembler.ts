/**
 * Income Assembler
 *
 * AppService that assembles IncomeData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { ITransactionXmlRepository } from "../../repositories/interfaces/transaction-xml-repository.interface";
import { convertToIncomeSections } from "../../domain/converters/income-converter";
import type { IncomeData } from "../../domain/report-data";

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
  constructor(private repository: ITransactionXmlRepository) {}

  async assemble(input: IncomeAssemblerInput): Promise<IncomeData> {
    const transactions = await this.repository.findIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    const { businessIncome, otherIncome } =
      convertToIncomeSections(transactions);

    return {
      businessIncome,
      otherIncome,
    };
  }
}
