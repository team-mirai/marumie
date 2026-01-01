"use server";

import { bufferToString } from "@/server/contexts/shared/domain/services/encoding-converter";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import { DonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import { DonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import { DonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import {
  CsvFormatError,
  ProcessingError,
} from "@/server/contexts/report/domain/errors/donor-csv-error";
import { PreviewDonorCsvUsecase } from "@/server/contexts/report/application/usecases/preview-donor-csv-usecase";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";

export interface PreviewDonorCsvRequest {
  file: File;
  politicalOrganizationId: string;
}

export async function previewDonorCsv(
  data: PreviewDonorCsvRequest,
): Promise<PreviewDonorCsvResult> {
  try {
    const { file, politicalOrganizationId } = data;

    if (!file) {
      throw new Error("ファイルが選択されていません");
    }

    if (!politicalOrganizationId) {
      throw new Error("政治団体IDが指定されていません");
    }

    const csvBuffer = Buffer.from(await file.arrayBuffer());
    const csvContent = bufferToString(csvBuffer);

    const csvLoader = new DonorCsvLoader();
    const recordConverter = new DonorCsvRecordConverter();
    const validator = new DonorCsvValidator();
    const transactionRepository = new PrismaTransactionWithDonorRepository(prisma);
    const donorRepository = new PrismaDonorRepository(prisma);

    const usecase = new PreviewDonorCsvUsecase(
      csvLoader,
      recordConverter,
      validator,
      transactionRepository,
      donorRepository,
    );

    const result = await usecase.execute({
      csvContent,
      politicalOrganizationId,
    });

    return result;
  } catch (error) {
    console.error("Preview Donor CSV error:", error);
    if (error instanceof CsvFormatError) {
      throw new Error("CSVファイルの形式が正しくありません。テンプレートを確認してください");
    }
    if (error instanceof ProcessingError) {
      throw new Error("処理に失敗しました。時間をおいて再度お試しください");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("予期しないエラーが発生しました");
  }
}
