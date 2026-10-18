import "server-only";
import { GetMaskedDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-masked-document-usecase";
import { CountUnfinishedDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/count-unfinished-document-masking-usecase";
import { ProcessDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/process-document-masking-usecase";
import { RequestDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/request-document-masking-usecase";
import { ReceiptMaskingService } from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import { VercelAIPersonalInfoRegionDetector } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-personal-info-region-detector";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";
import { PrismaDocumentMaskingRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document-masking.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { loadResearchFundWritePermission } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export function buildProcessDocumentMaskingUsecase(): ProcessDocumentMaskingUsecase {
  return new ProcessDocumentMaskingUsecase(
    new PrismaDocumentMaskingRepository(prisma),
    buildDocumentStorage(),
    new ReceiptMaskingService(
      new PdfiumDocumentRasterCodec(),
      new VercelAIPersonalInfoRegionDetector(),
    ),
  );
}

export function buildRequestDocumentMaskingUsecase(): RequestDocumentMaskingUsecase {
  return new RequestDocumentMaskingUsecase(new PrismaDocumentMaskingRepository(prisma));
}

/**
 * 帳簿の画面で公開用の版を作り進める必要がある件数（未作成・作成中）。
 * 書き込めない利用者・選択中でない帳簿では作り進めないので 0 を返す
 */
export async function loadUnfinishedDocumentMasking(
  politicianId: string,
  bookId: string,
): Promise<number> {
  const canWrite = await loadResearchFundWritePermission();
  if (!canWrite(politicianId)) return 0;
  if (!(await requireJournalTarget(politicianId, bookId))) return 0;
  return await new CountUnfinishedDocumentMaskingUsecase(
    new PrismaDocumentMaskingRepository(prisma),
  ).execute(bookId);
}

/** 選択中の帳簿の書類の、公開用の版の署名 URL。版がまだ無ければ null */
export async function loadMaskedDocument(politicianId: string, bookId: string, documentId: string) {
  if (!(await requireJournalTarget(politicianId, bookId))) return null;
  const result = await new GetMaskedDocumentUsecase(
    new PrismaDocumentMaskingRepository(prisma),
    buildDocumentStorage(),
  ).execute({ bookId, documentId, expiresIn: 300 });
  return result.status === "valid" ? { signedUrl: result.value.signedUrl } : null;
}
