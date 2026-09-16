import "server-only";
import { notFound } from "next/navigation";
import { ManageScanUsecase } from "@/server/contexts/research-fund/application/usecases/manage-scan-usecase";
import { ProcessScanJobsUsecase } from "@/server/contexts/research-fund/application/usecases/process-scan-jobs-usecase";
import { VercelAIReceiptExtractionGateway } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-receipt-extraction-gateway";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { PrismaScanRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-scan.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export function buildScanUsecase(): ManageScanUsecase {
  return new ManageScanUsecase(
    new PrismaScanRepository(prisma),
    new PrismaPromptRepository(prisma),
    buildDocumentStorage(),
    // ジョブに記録するモデル名。実際の読み取りもゲートウェイが同じ環境変数を見る
    process.env.RESEARCH_FUND_EXTRACTION_MODEL?.trim() || "claude-sonnet-5",
  );
}

export function buildProcessScanJobsUsecase(): ProcessScanJobsUsecase {
  return new ProcessScanJobsUsecase(
    new PrismaScanRepository(prisma),
    buildDocumentStorage(),
    new VercelAIReceiptExtractionGateway(),
  );
}

export async function loadScan(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const data = await buildScanUsecase().list(target.politicianId, bookId);
  return { ...data, target };
}
