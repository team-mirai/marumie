"use server";

import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionRepository } from "../repositories/prisma-transaction.repository";
import { GenerateOtherIncomeXmlUsecase } from "../usecases/generate-other-income-xml-usecase";
import type { OtherIncomeSection } from "../xml/sections/syuushi07_06__other_income";

export interface ExportOtherIncomeXmlInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface ExportOtherIncomeXmlResult {
  xml: string;
  filename: string;
  section: OtherIncomeSection;
}

export async function exportOtherIncomeXml(
  input: ExportOtherIncomeXmlInput,
): Promise<ExportOtherIncomeXmlResult> {
  if (!input.politicalOrganizationId?.trim()) {
    throw new Error("政治団体IDは必須です");
  }

  if (!Number.isFinite(input.financialYear)) {
    throw new Error("報告年は有効な数値である必要があります");
  }

  const repository = new PrismaTransactionRepository(prisma);
  const usecase = new GenerateOtherIncomeXmlUsecase(repository);

  const result = await usecase.execute({
    politicalOrganizationId: input.politicalOrganizationId,
    financialYear: input.financialYear,
  });

  return {
    xml: result.xml,
    filename: result.filename,
    section: result.section,
  };
}
