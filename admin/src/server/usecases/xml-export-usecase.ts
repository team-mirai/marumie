import * as iconv from "iconv-lite";
import type { ITransactionXmlRepository } from "../repositories/interfaces/transaction-xml-repository.interface";
import {
  convertToOtherIncomeSection,
  type OtherIncomeSection,
} from "../domain/converters/income-converter";
import {
  serializeReportData,
  type XmlSectionType,
  KNOWN_FORM_IDS,
  FLAG_STRING_LENGTH,
} from "../domain/serializers/report-serializer";
import { type ReportData, createEmptyReportData } from "../domain/report-data";

// ============================================================
// Types
// ============================================================

// Re-export for consumers
export type { XmlSectionType };
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };

// Union type for all section data (will grow as more sections are added)
export type SectionData = OtherIncomeSection;

export interface XmlExportInput {
  politicalOrganizationId: string;
  financialYear: number;
  sections: XmlSectionType[];
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
    // Step 1: Assemble ReportData by gathering all requested sections
    const reportData = await this.assembleReportData(input);

    // Step 2: Serialize ReportData to XML (domain layer)
    const xml = serializeReportData(reportData, input.sections);

    // Step 3: Encode to Shift_JIS
    const shiftJisBuffer = iconv.encode(xml, "shift_jis");

    // Generate filename based on sections
    const sectionsStr = input.sections.join("_");
    const filename = `${sectionsStr}_${input.politicalOrganizationId}_${input.financialYear}.xml`;

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
    const reportData = createEmptyReportData();

    for (const sectionType of input.sections) {
      await this.assembleSection(sectionType, input, reportData);
    }

    return reportData;
  }

  private async assembleSection(
    sectionType: XmlSectionType,
    input: XmlExportInput,
    reportData: ReportData,
  ): Promise<void> {
    switch (sectionType) {
      case "SYUUSHI07_06": {
        await this.assembleOtherIncome(input, reportData);
        break;
      }
      default:
        throw new Error(`Unsupported section type: ${sectionType}`);
    }
  }

  private async assembleOtherIncome(
    input: XmlExportInput,
    reportData: ReportData,
  ): Promise<void> {
    // Fetch from repository
    const transactions = await this.repository.findOtherIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    // Convert to domain object and store in appropriate group
    if (!reportData.income) {
      reportData.income = {};
    }
    reportData.income.otherIncome = convertToOtherIncomeSection(transactions);
  }
}
