import "server-only";
import { revalidatePath } from "next/cache";
import { GetMaskedDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-masked-document-usecase";
import { ProcessDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/process-document-masking-usecase";
import { RecoverDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/recover-document-masking-usecase";
import { RequestDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/request-document-masking-usecase";
import { ReceiptMaskingService } from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import { VercelAIPersonalInfoRegionDetector } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-personal-info-region-detector";
import { PdfiumDocumentRasterCodec } from "@/server/contexts/research-fund/infrastructure/raster/pdfium-document-raster-codec";
import { buildDocumentMaskingQueue } from "@/server/contexts/research-fund/infrastructure/queue/vercel-document-masking-queue";
import { PrismaDocumentMaskingRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document-masking.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

function buildProcessDocumentMaskingUsecase(): ProcessDocumentMaskingUsecase {
  return new ProcessDocumentMaskingUsecase(
    new PrismaDocumentMaskingRepository(prisma),
    buildDocumentStorage(),
    new ReceiptMaskingService(
      new PdfiumDocumentRasterCodec(),
      new VercelAIPersonalInfoRegionDetector(),
    ),
    buildDocumentMaskingQueue(),
  );
}

function buildRecoverDocumentMaskingUsecase(): RecoverDocumentMaskingUsecase {
  return new RecoverDocumentMaskingUsecase(
    new PrismaDocumentMaskingRepository(prisma),
    buildDocumentMaskingQueue(),
    buildProcessDocumentMaskingUsecase(),
  );
}

/**
 * 書類の登録・作り直しの依頼の後に、公開用の版の作成をキューに依頼する（#1812）。
 * キューを使えない環境では何もしない。積めなくても定期実行が拾い直すので、登録や依頼は失敗させない
 */
export async function notifyDocumentMasking(): Promise<void> {
  await buildDocumentMaskingQueue().notify();
}

export function buildRequestDocumentMaskingUsecase(): RequestDocumentMaskingUsecase {
  return new RequestDocumentMaskingUsecase(new PrismaDocumentMaskingRepository(prisma));
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

/**
 * キューから届いたメッセージで、公開用の版を 1 件作る（#1812）。
 * 作ったときは、次に画面を開いた・再読み込みしたときに最新の状態が出るよう再検証する
 */
export async function processDocumentMaskingFromQueue(): Promise<void> {
  const result = await buildProcessDocumentMaskingUsecase().execute();
  if (result.processed > 0) revalidatePath("/(auth)", "layout");
}

/** 定期実行で、公開用の版の作成の取りこぼしを拾い直す（#1812） */
export async function recoverDocumentMasking() {
  const result = await buildRecoverDocumentMaskingUsecase().execute();
  if (result.processed > 0 || result.failedStale > 0) revalidatePath("/(auth)", "layout");
  return result;
}
