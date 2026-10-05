import "server-only";
import { notFound } from "next/navigation";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { ListJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/list-journal-review-usecase";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";

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
  ).execute(bookId);
  return { ...data, target };
}
