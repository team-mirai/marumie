import * as iconv from "iconv-lite";
import { buildXmlDocument } from "../xml/document-builder";
import {
  aggregateOtherIncomeFromTransactions,
  serializeOtherIncomeSection,
  resolveTransactionAmount,
  type OtherIncomeSection,
  type SectionTransaction,
} from "../xml/sections/syuushi07_06__other_income";
import type { ITransactionRepository } from "../repositories/interfaces/transaction-repository.interface";

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
  constructor(private repository: ITransactionRepository) {}

  async execute(
    input: GenerateOtherIncomeXmlInput,
  ): Promise<GenerateOtherIncomeXmlResult> {
    const transactions = await this.repository.findOtherIncomeTransactions({
      politicalOrganizationId: input.politicalOrganizationId,
      financialYear: input.financialYear,
    });

    const sectionTransactions: SectionTransaction[] = transactions.map((t) => ({
      transactionNo: t.transactionNo,
      label: t.label,
      description: t.description,
      memo: t.memo,
      amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
    }));

    const section = aggregateOtherIncomeFromTransactions(sectionTransactions);

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
