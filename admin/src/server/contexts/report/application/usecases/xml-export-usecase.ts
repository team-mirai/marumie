import "server-only";

import * as iconv from "iconv-lite";
import {
  serializeReportData,
  KNOWN_FORM_IDS,
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
export { KNOWN_FORM_IDS };

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

    // Generate filename with format: report_{fy}_{org_slug}_{exportedDateTime}.xml
    const slug = await this.profileRepository.getOrganizationSlug(input.politicalOrganizationId);
    const filename = this.generateFilename(input.financialYear, slug);

    return {
      xml,
      shiftJisBuffer,
      filename,
      reportData,
    };
  }

  generateFilename(financialYear: number, slug: string | null): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const exportedDateTime = `${year}${month}${day}_${hours}${minutes}`;

    const orgSlug = slug ?? "unknown";
    return `report_${financialYear}_${orgSlug}_${exportedDateTime}.xml`;
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
