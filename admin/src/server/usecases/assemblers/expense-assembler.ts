/**
 * Expense Assembler
 *
 * AppService that assembles ExpenseData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "../../repositories/interfaces/report-transaction-repository.interface";
import {
  convertToRegularExpenseData,
  convertToPoliticalActivityExpenseData,
  convertToGrantToHeadquartersSection,
} from "../../domain/converters/expense-converter";
import type {
  RegularExpenseData,
  PoliticalActivityExpenseData,
  GrantToHeadquartersSection,
} from "../../domain/converters/expense-converter";

// ============================================================
// Types
// ============================================================

export interface ExpenseAssemblerInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface ExpenseData {
  regularExpenses: RegularExpenseData; // SYUUSHI07_14
  politicalActivityExpenses: PoliticalActivityExpenseData; // SYUUSHI07_15
  grantToHeadquarters: GrantToHeadquartersSection; // SYUUSHI07_16
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

    // SYUUSHI07_14: 経常経費（光熱水費、備品・消耗品費、事務所費）
    const [utilities, equipmentSupplies, officeExpenses] = await Promise.all([
      this.repository.findUtilityExpenseTransactions(filters),
      this.repository.findEquipmentSuppliesExpenseTransactions(filters),
      this.repository.findOfficeExpenseTransactions(filters),
    ]);

    // SYUUSHI07_15: 政治活動費（9カテゴリ）
    const [
      organizationalActivities,
      electionExpenses,
      publicationExpenses,
      advertisingExpenses,
      fundraisingPartyExpenses,
      otherBusinessExpenses,
      researchExpenses,
      donationsGrantsExpenses,
      otherExpenses,
    ] = await Promise.all([
      this.repository.findOrganizationalExpenseTransactions(filters),
      this.repository.findElectionExpenseTransactions(filters),
      this.repository.findPublicationExpenseTransactions(filters),
      this.repository.findAdvertisingExpenseTransactions(filters),
      this.repository.findFundraisingPartyExpenseTransactions(filters),
      this.repository.findOtherBusinessExpenseTransactions(filters),
      this.repository.findResearchExpenseTransactions(filters),
      this.repository.findDonationsGrantsExpenseTransactions(filters),
      this.repository.findOtherExpenseTransactions(filters),
    ]);

    // SYUUSHI07_16: 本部又は支部に対する交付金
    const grantToHeadquartersTransactions =
      await this.repository.findGrantToHeadquartersTransactions(filters);

    return {
      regularExpenses: convertToRegularExpenseData(
        utilities,
        equipmentSupplies,
        officeExpenses,
      ),
      politicalActivityExpenses: convertToPoliticalActivityExpenseData(
        organizationalActivities,
        electionExpenses,
        publicationExpenses,
        advertisingExpenses,
        fundraisingPartyExpenses,
        otherBusinessExpenses,
        researchExpenses,
        donationsGrantsExpenses,
        otherExpenses,
      ),
      grantToHeadquarters: convertToGrantToHeadquartersSection(
        grantToHeadquartersTransactions,
      ),
    };
  }
}
