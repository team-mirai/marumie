import * as iconv from "iconv-lite";
import { buildXmlDocument } from "../xml/document-builder";
import {
  buildOtherIncomeSection,
  serializeOtherIncomeSection,
  type OtherIncomeSection,
} from "../xml/sections/syuushi07_06__other_income";

export interface GenerateOtherIncomeXmlInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface GenerateOtherIncomeXmlResult {
  xml: string;
  shiftJisBuffer: Buffer;
  filename: string;
  section: OtherIncomeSection;
}

export class GenerateOtherIncomeXmlUsecase {
  async execute(
    input: GenerateOtherIncomeXmlInput,
  ): Promise<GenerateOtherIncomeXmlResult> {
    const section = await buildOtherIncomeSection({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    const sectionXml = serializeOtherIncomeSection(section);
    const xml = buildXmlDocument({
      sections: [sectionXml],
    });

    const shiftJisBuffer = iconv.encode(xml, "shift_jis");
    const filename = `SYUUSHI07_06_${input.politicalOrganizationId}_${input.financialYear}.xml`;

    return {
      xml,
      shiftJisBuffer,
      filename,
      section,
    };
  }
}
