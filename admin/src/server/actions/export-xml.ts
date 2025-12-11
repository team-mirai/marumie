"use server";

import { prisma } from "@/server/lib/prisma";
import { PrismaReportTransactionRepository } from "../repositories/prisma-report-transaction.repository";
import { XmlExportUsecase } from "../usecases/xml-export-usecase";
import { DonationAssembler } from "../usecases/assemblers/donation-assembler";
import { IncomeAssembler } from "../usecases/assemblers/income-assembler";
import { ExpenseAssembler } from "../usecases/assemblers/expense-assembler";
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

  const repository = new PrismaReportTransactionRepository(prisma);
  const donationAssembler = new DonationAssembler(repository);
  const incomeAssembler = new IncomeAssembler(repository);
  const expenseAssembler = new ExpenseAssembler(repository);
  const usecase = new XmlExportUsecase(
    donationAssembler,
    incomeAssembler,
    expenseAssembler,
  );

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
