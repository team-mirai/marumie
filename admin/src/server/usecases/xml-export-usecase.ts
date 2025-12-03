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

    const xml = this.buildXmlDocument([sectionXml]);
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
    head: Partial<XmlHead> = {},
  ): string {
    const resolvedHead: XmlHead = {
      ...DEFAULT_HEAD,
      ...head,
    };

    const doc = create({ version: "1.0", encoding: "Shift_JIS" }).ele("BOOK");

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

    for (const section of sections) {
      doc.import(section);
    }

    return doc.end({ prettyPrint: true, indent: "  " });
  }
}
