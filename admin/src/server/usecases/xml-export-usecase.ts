import * as iconv from "iconv-lite";
import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { ITransactionXmlRepository } from "../repositories/interfaces/transaction-xml-repository.interface";
import {
  convertToOtherIncomeSection,
  type OtherIncomeSection,
} from "../domain/converters/other-income-converter";
import { serializeOtherIncomeSection } from "../domain/serializers/other-income-serializer";
import { type ReportData, createEmptyReportData } from "../domain/report-data";

// ============================================================
// Types
// ============================================================

interface XmlHead {
  version: string;
  appName: string;
  fileFormatNo: string;
  kokujiAppFlag: string;
  choboAppVersion: string;
}

const DEFAULT_HEAD: XmlHead = {
  version: "20081001",
  appName: "収支報告書作成ソフト (収支報告書作成ソフト)",
  fileFormatNo: "1",
  kokujiAppFlag: "0",
  choboAppVersion: "20081001",
};

// Form IDs in the order they appear in SYUUSHI_UMU flag string
// 第14号様式 (収支報告書)
const KNOWN_FORM_IDS = [
  "SYUUSHI07_01", // (1) 個人からの寄附
  "SYUUSHI07_02", // (2) 法人その他の団体からの寄附
  "SYUUSHI07_03", // (3) 政治団体からの寄附
  "SYUUSHI07_04", // (4) 政治資金パーティー開催事業の収入
  "SYUUSHI07_05", // (5) 本部または支部からの交付金
  "SYUUSHI07_06", // (6) その他の収入
  "SYUUSHI07_07", // (7) 人件費
  "SYUUSHI07_08", // (8) 光熱水費
  "SYUUSHI07_09", // (9) 備品・消耗品費
  "SYUUSHI07_10", // (10) 事務所費
  "SYUUSHI07_11", // (11) 組織活動費
  "SYUUSHI07_12", // (12) 選挙関係費
  "SYUUSHI07_13", // (13) 機関紙誌の発行その他の事業費
  "SYUUSHI07_14", // (14) 調査研究費
  "SYUUSHI07_15", // (15) 寄附・交付金
  "SYUUSHI07_16", // (16) その他の経常経費
  "SYUUSHI07_17", // (17) 土地
  "SYUUSHI07_18", // (18) 建物
  "SYUUSHI07_19", // (19) 動産(船舶、航空機、自動車、事務機器等)
  "SYUUSHI07_20", // (20) 預金等
  "SYUUSHI08", // 第15号様式 (資産等の状況)
  "SYUUSHI08_02", // 第15号様式 (負債の状況)
  "SYUUSHI_KIFUKOUJYO", // 寄附控除
] as const;

const FLAG_STRING_LENGTH = 51;

// Section type uses form IDs directly
export type XmlSectionType = (typeof KNOWN_FORM_IDS)[number];

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

    // Step 2: Serialize ReportData to XML
    const { xml, sectionXmls } = this.serializeReportData(
      reportData,
      input.sections,
    );

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
        reportData.otherIncome = await this.assembleOtherIncome(input);
        break;
      }
      default:
        throw new Error(`Unsupported section type: ${sectionType}`);
    }
  }

  private async assembleOtherIncome(
    input: XmlExportInput,
  ): Promise<OtherIncomeSection> {
    // Fetch from repository
    const transactions = await this.repository.findOtherIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    // Convert to domain object
    return convertToOtherIncomeSection(transactions);
  }

  // ============================================================
  // Serialize: Convert ReportData to XML
  // ============================================================

  private serializeReportData(
    reportData: ReportData,
    sections: XmlSectionType[],
  ): { xml: string; sectionXmls: XMLBuilder[] } {
    const sectionXmls: XMLBuilder[] = [];

    for (const sectionType of sections) {
      const sectionXml = this.serializeSection(sectionType, reportData);
      sectionXmls.push(sectionXml);
    }

    const xml = this.buildXmlDocument(sectionXmls, sections);
    return { xml, sectionXmls };
  }

  private serializeSection(
    sectionType: XmlSectionType,
    reportData: ReportData,
  ): XMLBuilder {
    switch (sectionType) {
      case "SYUUSHI07_06": {
        if (!reportData.otherIncome) {
          throw new Error("OtherIncome section data not assembled");
        }
        return serializeOtherIncomeSection(reportData.otherIncome);
      }
      default:
        throw new Error(`Unsupported section type: ${sectionType}`);
    }
  }

  private buildXmlDocument(
    sections: XMLBuilder[],
    availableFormIds: XmlSectionType[],
    head: Partial<XmlHead> = {},
  ): string {
    const resolvedHead: XmlHead = {
      ...DEFAULT_HEAD,
      ...head,
    };

    const doc = create({ version: "1.0", encoding: "Shift_JIS" }).ele("BOOK");

    // Build HEAD section
    doc
      .ele("HEAD")
      .ele("VERSION")
      .txt(resolvedHead.version)
      .up()
      .ele("APP")
      .txt(resolvedHead.appName)
      .up()
      .ele("FILE_FORMAT_NO")
      .txt(resolvedHead.fileFormatNo)
      .up()
      .ele("KOKUJI_APP_FLG")
      .txt(resolvedHead.kokujiAppFlag)
      .up()
      .ele("CHOUBO_APP_VER")
      .txt(resolvedHead.choboAppVersion)
      .up()
      .up();

    // Build SYUUSHI_FLG section
    const syuushiFlgSection = this.buildSyuushiFlgSection(availableFormIds);
    doc.import(syuushiFlgSection);

    // Import data sections
    for (const section of sections) {
      doc.import(section);
    }

    return doc.end({ prettyPrint: true, indent: "  " });
  }

  private buildSyuushiFlgSection(availableFormIds: string[]): XMLBuilder {
    const formSet = new Set(
      availableFormIds.filter((formId) =>
        KNOWN_FORM_IDS.includes(formId as (typeof KNOWN_FORM_IDS)[number]),
      ),
    );

    const flagString = KNOWN_FORM_IDS.map((formId) =>
      formSet.has(formId) ? "1" : "0",
    )
      .join("")
      .padEnd(FLAG_STRING_LENGTH, "0")
      .slice(0, FLAG_STRING_LENGTH);

    const frag = create().ele("SYUUSHI_FLG");
    frag.ele("SYUUSHI_UMU_FLG").ele("SYUUSHI_UMU").txt(flagString);

    return frag;
  }
}

// Export constants for testing
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };
