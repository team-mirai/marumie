import * as iconv from "iconv-lite";
import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { ITransactionXmlRepository } from "../repositories/interfaces/transaction-xml-repository.interface";
import {
  DEFAULT_SECTION_XML,
  DEFAULT_SYUUSHI_FLAG_STRING,
  DEFAULT_XML_HEAD,
  type XmlSectionId,
} from "./xml/defaults";
import {
  Syuushi0706OtherIncomeUsecase,
  type OtherIncomeSection,
} from "./xml/syuushi07_06__other_income-usecase";

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
  sectionsData: Partial<Record<XmlSectionType, SectionData>>;
}

// ============================================================
// Usecase
// ============================================================

export class XmlExportUsecase {
  constructor(private repository: ITransactionXmlRepository) {}

  async execute(input: XmlExportInput): Promise<XmlExportResult> {
    const dynamicSections: Partial<Record<XmlSectionId, XMLBuilder>> = {};
    const sectionsData: Partial<Record<XmlSectionType, SectionData>> = {};

    // Build each requested section dynamically
    for (const sectionType of input.sections) {
      const result = await this.buildSection(sectionType, input);
      dynamicSections[sectionType as XmlSectionId] = result.sectionXml;
      sectionsData[sectionType] = result.section;
    }

    const xml = this.buildXmlDocument(dynamicSections, input.sections);
    const shiftJisBuffer = iconv.encode(xml, "shift_jis");

    // Generate filename based on sections
    const sectionsStr = input.sections.join("_");
    const filename = `${sectionsStr}_${input.politicalOrganizationId}_${input.financialYear}.xml`;

    return {
      xml,
      shiftJisBuffer,
      filename,
      sectionsData,
    };
  }

  private async buildSection(
    sectionType: XmlSectionType,
    input: XmlExportInput,
  ) {
    switch (sectionType) {
      case "SYUUSHI07_06": {
        const usecase = new Syuushi0706OtherIncomeUsecase(this.repository);
        const result = await usecase.execute({
          politicalOrganizationId: input.politicalOrganizationId,
          financialYear: input.financialYear,
        });
        return {
          sectionXml: result.sectionXml,
          section: result.section,
        };
      }
      default:
        throw new Error(`Unsupported section type: ${sectionType}`);
    }
  }

  private buildXmlDocument(
    dynamicSections: Partial<Record<XmlSectionId, XMLBuilder>>,
    availableFormIds: XmlSectionType[],
    head: Partial<XmlHead> = {},
  ): string {
    const resolvedHead: XmlHead = {
      ...DEFAULT_XML_HEAD,
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

    // Import all sections in order, using dynamic sections where available,
    // falling back to defaults otherwise
    for (const formId of KNOWN_FORM_IDS) {
      const sectionId = formId as XmlSectionId;
      if (dynamicSections[sectionId]) {
        // Use dynamically built section
        doc.import(dynamicSections[sectionId]);
      } else if (DEFAULT_SECTION_XML[sectionId]) {
        // Parse and import default section XML
        const defaultXml = DEFAULT_SECTION_XML[sectionId];
        const parsed = create(defaultXml);
        doc.import(parsed);
      }
    }

    return doc.end({ prettyPrint: true, indent: "  " });
  }

  private buildSyuushiFlgSection(availableFormIds?: string[]): XMLBuilder {
    // Start with default flag bits
    const bits = DEFAULT_SYUUSHI_FLAG_STRING.padEnd(FLAG_STRING_LENGTH, "0")
      .slice(0, FLAG_STRING_LENGTH)
      .split("");

    // Merge in any additional form IDs
    if (availableFormIds?.length) {
      availableFormIds.forEach((formId) => {
        const index = KNOWN_FORM_IDS.indexOf(
          formId as (typeof KNOWN_FORM_IDS)[number],
        );
        if (index >= 0) {
          bits[index] = "1";
        }
      });
    }

    const flagString = bits.join("");

    const frag = create().ele("SYUUSHI_FLG");
    frag.ele("SYUUSHI_UMU_FLG").ele("SYUUSHI_UMU").txt(flagString);

    return frag;
  }
}

// Export constants for testing
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH };
