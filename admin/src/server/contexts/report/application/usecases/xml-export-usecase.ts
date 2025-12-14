import "server-only";

import * as iconv from "iconv-lite";
import {
  serializeReportData,
  KNOWN_FORM_IDS,
  FLAG_STRING_LENGTH,
} from "@/server/contexts/report/domain/services/report-serializer";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";
import type { DonationAssembler } from "@/server/contexts/report/application/services/donation-assembler";
import type { ExpenseAssembler } from "@/server/contexts/report/application/services/expense-assembler";
import type { IncomeAssembler } from "@/server/contexts/report/application/services/income-assembler";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";

// ============================================================
// Types
// ============================================================

// Re-export for consumers
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };

export interface XmlExportInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface XmlExportResult {
  xml: string;
  shiftJisBuffer: Buffer;
  filename: string;
  reportData: ReportData;
}

// ============================================================
// Usecase
// ============================================================

export class XmlExportUsecase {
  constructor(
    private profileRepository: IOrganizationReportProfileRepository,
    private donationAssembler: DonationAssembler,
    private incomeAssembler: IncomeAssembler,
    private expenseAssembler: ExpenseAssembler,
  ) {}

  async execute(input: XmlExportInput): Promise<XmlExportResult> {
    // Step 1: Assemble ReportData by gathering all sections
    const reportData = await this.assembleReportData(input);

    // Step 2: Serialize ReportData to XML (domain layer)
    const xml = serializeReportData(reportData);

    // Step 3: Encode to Shift_JIS
    const shiftJisBuffer = iconv.encode(xml, "shift_jis");

    // Generate filename
    const filename = `report_${input.politicalOrganizationId}_${input.financialYear}.xml`;

    return {
      xml,
      shiftJisBuffer,
      filename,
      reportData,
    };
  }

  // ============================================================
  // Assemble: Gather data from repositories and convert to domain objects
  // ============================================================

  private async assembleReportData(input: XmlExportInput): Promise<ReportData> {
    const assemblerInput = {
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    };

    const [profile, donations, income, expenses] = await Promise.all([
      this.profileRepository.findByOrganizationIdAndYear(
        input.politicalOrganizationId,
        input.financialYear,
      ),
      this.donationAssembler.assemble(assemblerInput),
      this.incomeAssembler.assemble(assemblerInput),
      this.expenseAssembler.assemble(assemblerInput),
    ]);

    if (!profile) {
      throw new Error(
        `Profile not found for organization ${input.politicalOrganizationId} and year ${input.financialYear}`,
      );
    }

    return {
      profile,
      donations,
      income,
      expenses,
    };
  }
}
