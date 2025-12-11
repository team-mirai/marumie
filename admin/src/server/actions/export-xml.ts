"use server";

import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionXmlRepository } from "../repositories/prisma-transaction-xml.repository";
import { XmlExportUsecase } from "../usecases/xml-export-usecase";
import type { ReportData } from "../domain/report-data";

export interface ExportXmlInput {
  politicalOrganizationId: string;
  financialYear: number;
}

export interface ExportXmlResult {
  xml: string;
  filename: string;
  reportData: ReportData;
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
  });

  return {
    xml: result.xml,
    filename: result.filename,
    reportData: result.reportData,
  };
}
