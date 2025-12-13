"use server";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import { XmlExportUsecase } from "@/server/contexts/report/application/usecases/xml-export-usecase";
import { DonationAssembler } from "@/server/contexts/report/application/services/donation-assembler";
import { ExpenseAssembler } from "@/server/contexts/report/application/services/expense-assembler";
import { IncomeAssembler } from "@/server/contexts/report/application/services/income-assembler";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";

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
