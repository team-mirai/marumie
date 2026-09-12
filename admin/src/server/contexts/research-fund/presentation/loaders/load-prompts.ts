import "server-only";
import { notFound } from "next/navigation";
import { ManagePromptUsecase } from "@/server/contexts/research-fund/application/usecases/manage-prompt-usecase";
import { TestPromptUsecase } from "@/server/contexts/research-fund/application/usecases/test-prompt-usecase";
import { VercelAIReceiptExtractionGateway } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-receipt-extraction-gateway";
import { PrismaDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document.repository";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildDocumentStorage } from "@/server/contexts/research-fund/presentation/loaders/load-scan";
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
    new ManagePromptUsecase(new PrismaPromptRepository(prisma)).list(target.politicianId),
    buildTestPromptUsecase().listDocuments(bookId),
  ]);
  return { ...data, testDocuments, target };
}
