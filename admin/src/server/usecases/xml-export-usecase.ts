import * as iconv from "iconv-lite";
import type { ITransactionXmlRepository } from "../repositories/interfaces/transaction-xml-repository.interface";
import {
  convertToOtherIncomeSection,
  type OtherIncomeSection,
} from "../domain/converters/income-converter";
import {
  serializeReportData,
  KNOWN_FORM_IDS,
  FLAG_STRING_LENGTH,
} from "../domain/serializers/report-serializer";
import type { ReportData } from "../domain/report-data";

// ============================================================
// Types
// ============================================================

// Re-export for consumers
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };

// Union type for all section data (will grow as more sections are added)
export type SectionData = OtherIncomeSection;

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
  constructor(private repository: ITransactionXmlRepository) {}

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
    return {
      donations: {},
      income: {
        otherIncome: await this.fetchOtherIncome(input),
      },
      expenses: {},
    };
  }

  private async fetchOtherIncome(
    input: XmlExportInput,
  ): Promise<OtherIncomeSection> {
    const transactions = await this.repository.findOtherIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    return convertToOtherIncomeSection(transactions);
  }
}
