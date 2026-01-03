"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import { PrismaTransactionDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-donor.repository";
import { DonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import { DonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import { DonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import {
  CsvFormatError,
  NoValidRowsError,
} from "@/server/contexts/report/domain/errors/donor-csv-error";
import { ImportDonorCsvUsecase } from "@/server/contexts/report/application/usecases/import-donor-csv-usecase";

export interface ImportDonorCsvRequest {
  csvContent: string;
  politicalOrganizationId: string;
}

export type ImportDonorCsvResult =
  | { ok: true; importedCount: number; createdDonorCount: number }
  | { ok: false; error: string };

export async function importDonorCsv(data: ImportDonorCsvRequest): Promise<ImportDonorCsvResult> {
  try {
    const { csvContent, politicalOrganizationId } = data;

    if (!csvContent) {
      return { ok: false, error: "CSVの内容が空です" };
    }

    if (!politicalOrganizationId) {
      return { ok: false, error: "政治団体IDが指定されていません" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const csvLoader = new DonorCsvLoader();
      const recordConverter = new DonorCsvRecordConverter();
      const validator = new DonorCsvValidator();
      const transactionRepository = new PrismaTransactionWithDonorRepository(tx);
      const donorRepository = new PrismaDonorRepository(tx);
      const transactionDonorRepository = new PrismaTransactionDonorRepository(tx);

      const usecase = new ImportDonorCsvUsecase(
        csvLoader,
        recordConverter,
        validator,
        transactionRepository,
        donorRepository,
        transactionDonorRepository,
      );

      return await usecase.execute({
        csvContent,
        politicalOrganizationId,
      });
    });

    revalidatePath("/import/donors");

    return {
      ok: true,
      importedCount: result.importedCount,
      createdDonorCount: result.createdDonorCount,
    };
  } catch (error) {
    console.error("Import Donor CSV error:", error);

    if (error instanceof NoValidRowsError) {
      return { ok: false, error: "インポート可能な行がありません" };
    }
    if (error instanceof CsvFormatError) {
      return { ok: false, error: "CSVファイルの形式が正しくありません" };
    }
    if (error instanceof Error && error.message.includes("database")) {
      return {
        ok: false,
        error: "データベースへの保存に失敗しました。時間をおいて再試行してください",
      };
    }
    return { ok: false, error: "予期しないエラーが発生しました" };
  }
}
