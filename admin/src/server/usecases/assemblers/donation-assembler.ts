/**
 * Donation Assembler
 *
 * AppService that assembles DonationData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "../../repositories/interfaces/report-transaction-repository.interface";
import { convertToPersonalDonationSection } from "../../domain/converters/donation-converter";
import type { PersonalDonationSection } from "../../domain/converters/donation-converter";

// ============================================================
// Types
// ============================================================

export interface DonationAssemblerInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface DonationData {
  personalDonations: PersonalDonationSection;
}

// ============================================================
// Assembler
// ============================================================

export class DonationAssembler {
  constructor(private repository: IReportTransactionRepository) {}

  async assemble(input: DonationAssemblerInput): Promise<DonationData> {
    const filters = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    };

    const personalDonationTransactions =
      await this.repository.findPersonalDonationTransactions(filters);

    return {
      personalDonations: convertToPersonalDonationSection(
        personalDonationTransactions,
      ),
    };
  }
}
