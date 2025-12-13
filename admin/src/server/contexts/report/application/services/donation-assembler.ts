/**
 * Donation Assembler
 *
 * AppService that assembles DonationData by fetching data from repositories
 * and converting to domain objects.
 */
import "server-only";

import type { IReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/interfaces/report-transaction-repository.interface";
import { convertToPersonalDonationSection } from "@/server/contexts/report/domain/models/donation-converter";
import type { PersonalDonationSection } from "@/server/contexts/report/domain/models/donation-converter";

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
