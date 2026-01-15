"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import { PrismaTransactionDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-donor.repository";
import { PrismaTransactionManager } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-manager";
import { DonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import { DonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import { DonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import {
  CsvFormatError,
  NoValidRowsError,
} from "@/server/contexts/report/domain/errors/donor-csv-error";
import { ImportDonorCsvUsecase } from "@/server/contexts/report/application/usecases/import-donor-csv-usecase";

/**
 * クライアントから受け取る入力
 * tenantId は JSON シリアライズのため string で受け取る
 */
export interface ImportDonorCsvRequest {
  tenantId: string;
  csvContent: string;
  politicalOrganizationId: string;
}

export type ImportDonorCsvResult =
  | { ok: true; importedCount: number; createdDonorCount: number }
  | { ok: false; error: string };

export async function importDonorCsv(data: ImportDonorCsvRequest): Promise<ImportDonorCsvResult> {
  try {
    const { tenantId, csvContent, politicalOrganizationId } = data;

    if (!csvContent) {
      return { ok: false, error: "CSVコンテンツが指定されていません" };
    }

    if (!politicalOrganizationId) {
      return { ok: false, error: "政治団体IDが指定されていません" };
    }

    const csvLoader = new DonorCsvLoader();
    const recordConverter = new DonorCsvRecordConverter();
    const validator = new DonorCsvValidator();
    const transactionRepository = new PrismaTransactionWithDonorRepository(prisma);
    const donorRepository = new PrismaDonorRepository(prisma);
    const transactionDonorRepository = new PrismaTransactionDonorRepository(prisma);
    const transactionManager = new PrismaTransactionManager(prisma);

    const usecase = new ImportDonorCsvUsecase(
      csvLoader,
      recordConverter,
      validator,
      transactionRepository,
      donorRepository,
      transactionDonorRepository,
      transactionManager,
    );

    const result = await usecase.execute({
      tenantId: BigInt(tenantId),
      csvContent,
      politicalOrganizationId,
    });

    revalidatePath("/import-donors");

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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return {
        ok: false,
        error: "データベースへの保存に失敗しました。時間をおいて再試行してください",
      };
    }
    return { ok: false, error: "予期しないエラーが発生しました" };
  }
}
