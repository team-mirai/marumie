import * as iconv from "iconv-lite";
import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import type { ITransactionXmlRepository } from "../repositories/interfaces/transaction-xml-repository.interface";
import {
  Syuushi0706OtherIncomeUsecase,
  type OtherIncomeSection,
} from "./xml/syuushi07_06__other_income-usecase";

// ============================================================
// Types
// ============================================================

export type XmlSectionType = "other-income";

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
const KNOWN_FORM_IDS = [
  "SYUUSHI07_01",
  "SYUUSHI07_02",
  "SYUUSHI07_03",
  "SYUUSHI07_04",
  "SYUUSHI07_05",
  "SYUUSHI07_06",
  "SYUUSHI07_07",
  "SYUUSHI07_08",
  "SYUUSHI07_09",
  "SYUUSHI07_10",
  "SYUUSHI07_11",
  "SYUUSHI07_12",
  "SYUUSHI07_13",
  "SYUUSHI07_14",
  "SYUUSHI07_15",
  "SYUUSHI07_16",
  "SYUUSHI07_17",
  "SYUUSHI07_18",
  "SYUUSHI07_19",
  "SYUUSHI07_20",
  "SYUUSHI08",
  "SYUUSHI08_02",
  "SYUUSHI_KIFUKOUJYO",
] as const;

const FLAG_STRING_LENGTH = 51;

// Map XmlSectionType to form ID
const SECTION_TO_FORM_ID: Record<XmlSectionType, string> = {
  "other-income": "SYUUSHI07_06",
};

export interface XmlExportInput {
  politicalOrganizationId: string;
  financialYear: number;
  section: XmlSectionType;
}

export interface XmlExportResult {
  xml: string;
  shiftJisBuffer: Buffer;
  filename: string;
  sectionData: OtherIncomeSection; // Will be union type when more sections added
}

// ============================================================
// Usecase
// ============================================================

export class XmlExportUsecase {
  constructor(private repository: ITransactionXmlRepository) {}

  async execute(input: XmlExportInput): Promise<XmlExportResult> {
    const { sectionXml, section, filename } = await this.buildSection(input);

    // Determine which forms are available based on the sections being exported
    const availableFormIds = [SECTION_TO_FORM_ID[input.section]];

    const xml = this.buildXmlDocument([sectionXml], availableFormIds);
    const shiftJisBuffer = iconv.encode(xml, "shift_jis");

    return {
      xml,
      shiftJisBuffer,
      filename,
      sectionData: section,
    };
  }

  private async buildSection(input: XmlExportInput) {
    switch (input.section) {
      case "other-income": {
        const usecase = new Syuushi0706OtherIncomeUsecase(this.repository);
        return usecase.execute({
          politicalOrganizationId: input.politicalOrganizationId,
          financialYear: input.financialYear,
        });
      }
      default:
        throw new Error(`Unsupported section type: ${input.section}`);
    }
  }

  private buildXmlDocument(
    sections: XMLBuilder[],
    availableFormIds: string[],
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
export { KNOWN_FORM_IDS, FLAG_STRING_LENGTH, SECTION_TO_FORM_ID };
