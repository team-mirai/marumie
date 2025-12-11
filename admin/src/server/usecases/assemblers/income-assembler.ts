/**
 * Income Assembler
 *
 * AppService that assembles IncomeData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { ITransactionXmlRepository } from "../../repositories/interfaces/transaction-xml-repository.interface";
import {
  convertToBusinessIncomeSection,
  convertToOtherIncomeSection,
  type BusinessIncomeSection,
  type OtherIncomeSection,
} from "../../domain/converters/income-converter";
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
    const [businessIncome, otherIncome] = await Promise.all([
      this.fetchBusinessIncome(input),
      this.fetchOtherIncome(input),
    ]);

    return {
      businessIncome,
      otherIncome,
    };
  }

  private async fetchBusinessIncome(
    input: IncomeAssemblerInput,
  ): Promise<BusinessIncomeSection> {
    const transactions = await this.repository.findBusinessIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    return convertToBusinessIncomeSection(transactions);
  }

  private async fetchOtherIncome(
    input: IncomeAssemblerInput,
  ): Promise<OtherIncomeSection> {
    const transactions = await this.repository.findOtherIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    return convertToOtherIncomeSection(transactions);
  }
}
