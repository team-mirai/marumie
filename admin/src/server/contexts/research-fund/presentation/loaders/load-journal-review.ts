import "server-only";
import { notFound } from "next/navigation";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { ListDocumentMaskingsUsecase } from "@/server/contexts/research-fund/application/usecases/list-document-maskings-usecase";
import { PrismaDocumentMaskingRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document-masking.repository";
import { ListJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/list-journal-review-usecase";
import { PrismaDuplicateDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-duplicate-document.repository";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import { PrismaPayeeRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-payee.repository";

export async function requireJournalTarget(politicianId: string, bookId: string) {
  const { currentTarget } = await loadAdminTargets();
  if (
    currentTarget?.kind !== "research-fund" ||
    currentTarget.bookId !== bookId ||
    currentTarget.politicianId !== politicianId
  )
    return null;
  return currentTarget;
}
export async function loadJournalReview(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const data = await new ListJournalReviewUsecase(
    new PrismaJournalReviewRepository(prisma),
    new PrismaPayeeRepository(prisma),
    new PrismaDuplicateDocumentRepository(prisma),
  ).execute(bookId);
  const maskings = await new ListDocumentMaskingsUsecase(
    new PrismaDocumentMaskingRepository(prisma),
  ).execute(bookId);
  return { ...data, maskings, target };
}
