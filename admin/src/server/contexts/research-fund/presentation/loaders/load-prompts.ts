import "server-only";
import { notFound } from "next/navigation";
import { GetPromptOverviewUsecase } from "@/server/contexts/research-fund/application/usecases/get-prompt-overview-usecase";
import { ListPromptTestDocumentsUsecase } from "@/server/contexts/research-fund/application/usecases/list-prompt-test-documents-usecase";
import { TestPromptUsecase } from "@/server/contexts/research-fund/application/usecases/test-prompt-usecase";
import { VercelAIReceiptExtractionGateway } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-receipt-extraction-gateway";
import { PrismaDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document.repository";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export function buildTestPromptUsecase(): TestPromptUsecase {
  return new TestPromptUsecase(
    new PrismaDocumentRepository(prisma),
    buildDocumentStorage(),
    new VercelAIReceiptExtractionGateway(),
  );
}

export async function loadPrompts(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  // プロンプトは議員室（議員）ごと。年度帳簿をまたいで同じ版を使う
  const [data, testDocuments] = await Promise.all([
    new GetPromptOverviewUsecase(new PrismaPromptRepository(prisma)).execute(target.politicianId),
    new ListPromptTestDocumentsUsecase(new PrismaDocumentRepository(prisma)).execute(bookId),
  ]);
  return { ...data, testDocuments, target };
}
