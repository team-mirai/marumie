"use server";

import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionXmlRepository } from "../repositories/prisma-transaction-xml.repository";
import {
  XmlExportUsecase,
  type XmlSectionType,
} from "../usecases/xml-export-usecase";
import type { OtherIncomeSection } from "../usecases/xml/syuushi07_06__other_income-usecase";

export interface ExportXmlInput {
  politicalOrganizationId: string;
  financialYear: number;
  section: XmlSectionType;
}

export interface ExportXmlResult {
  xml: string;
  filename: string;
  sectionData: OtherIncomeSection; // Will be union type when more sections added
}

export async function exportXml(
  input: ExportXmlInput,
): Promise<ExportXmlResult> {
  if (!input.politicalOrganizationId?.trim()) {
    throw new Error("政治団体IDは必須です");
  }

  if (!Number.isFinite(input.financialYear)) {
    throw new Error("報告年は有効な数値である必要があります");
  }

  const repository = new PrismaTransactionXmlRepository(prisma);
  const usecase = new XmlExportUsecase(repository);

  const result = await usecase.execute({
    politicalOrganizationId: input.politicalOrganizationId,
    financialYear: input.financialYear,
    section: input.section,
  });

  return {
    xml: result.xml,
    filename: result.filename,
    sectionData: result.sectionData,
  };
}
