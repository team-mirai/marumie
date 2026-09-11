import "server-only";
import { notFound } from "next/navigation";
import { PublishJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/publish-journal-entries-usecase";
import { PrismaPublicationRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-publication.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export function publishJournalEntriesUsecase() {
  return new PublishJournalEntriesUsecase(
    new PrismaPublicationRepository(prisma),
    new WebappCacheInvalidator(),
  );
}

export async function loadPublication(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  return { ...(await publishJournalEntriesUsecase().snapshot(bookId)), target };
}
