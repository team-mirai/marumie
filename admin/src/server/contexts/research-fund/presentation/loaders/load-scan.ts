import "server-only";
import { notFound } from "next/navigation";
import { CreateRereadBatchUsecase } from "@/server/contexts/research-fund/application/usecases/create-reread-batch-usecase";
import { CreateScanBatchUsecase } from "@/server/contexts/research-fund/application/usecases/create-scan-batch-usecase";
import { ListDocumentMaskingsUsecase } from "@/server/contexts/research-fund/application/usecases/list-document-maskings-usecase";
import { ListScanBatchesUsecase } from "@/server/contexts/research-fund/application/usecases/list-scan-batches-usecase";
import { ProcessScanJobsUsecase } from "@/server/contexts/research-fund/application/usecases/process-scan-jobs-usecase";
import { RetryScanJobUsecase } from "@/server/contexts/research-fund/application/usecases/retry-scan-job-usecase";
import {
  researchFundExtractionModel,
  VercelAIReceiptExtractionGateway,
} from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-receipt-extraction-gateway";
import { PrismaDocumentMaskingRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document-masking.repository";
import { PrismaDuplicateDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-duplicate-document.repository";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { PrismaScanRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-scan.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export function buildCreateScanBatchUsecase(): CreateScanBatchUsecase {
  return new CreateScanBatchUsecase(
    new PrismaScanRepository(prisma),
    new PrismaPromptRepository(prisma),
    buildDocumentStorage(),
    researchFundExtractionModel(),
  );
}

export function buildCreateRereadBatchUsecase(): CreateRereadBatchUsecase {
  return new CreateRereadBatchUsecase(
    new PrismaScanRepository(prisma),
    new PrismaPromptRepository(prisma),
    researchFundExtractionModel(),
  );
}

export function buildProcessScanJobsUsecase(): ProcessScanJobsUsecase {
  return new ProcessScanJobsUsecase(
    new PrismaScanRepository(prisma),
    buildDocumentStorage(),
    new VercelAIReceiptExtractionGateway(),
  );
}

export function buildRetryScanJobUsecase(): RetryScanJobUsecase {
  return new RetryScanJobUsecase(new PrismaScanRepository(prisma));
}

export async function loadScan(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const data = await new ListScanBatchesUsecase(
    new PrismaScanRepository(prisma),
    new PrismaPromptRepository(prisma),
    new PrismaDuplicateDocumentRepository(prisma),
    researchFundExtractionModel(),
  ).execute(target.politicianId, bookId);
  const maskings = await new ListDocumentMaskingsUsecase(
    new PrismaDocumentMaskingRepository(prisma),
  ).execute(bookId);
  return { ...data, maskings, target };
}
