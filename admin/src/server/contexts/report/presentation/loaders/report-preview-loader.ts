import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import { PrismaOrganizationReportProfileRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-organization-report-profile.repository";
import { XmlExportUsecase } from "@/server/contexts/report/application/usecases/xml-export-usecase";
import { DonationAssembler } from "@/server/contexts/report/application/services/donation-assembler";
import { ExpenseAssembler } from "@/server/contexts/report/application/services/expense-assembler";
import { IncomeAssembler } from "@/server/contexts/report/application/services/income-assembler";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";

const CACHE_REVALIDATE_SECONDS = 60;

export interface ReportPreviewData {
  xml: string;
  reportData: ReportData;
}

export const loadReportPreviewData = unstable_cache(
  async (politicalOrganizationId: string, financialYear: number): Promise<ReportPreviewData> => {
    const transactionRepository = new PrismaReportTransactionRepository(prisma);
    const profileRepository = new PrismaOrganizationReportProfileRepository(prisma);
    const donationAssembler = new DonationAssembler(transactionRepository);
    const incomeAssembler = new IncomeAssembler(transactionRepository);
    const expenseAssembler = new ExpenseAssembler(transactionRepository);
    const usecase = new XmlExportUsecase(
      profileRepository,
      donationAssembler,
      incomeAssembler,
      expenseAssembler,
    );

    const result = await usecase.execute({
      politicalOrganizationId,
      financialYear,
    });

    return {
      xml: result.xml,
      reportData: result.reportData,
    };
  },
  ["report-preview"],
  {
    revalidate: CACHE_REVALIDATE_SECONDS,
    tags: ["report-preview"],
  },
);
