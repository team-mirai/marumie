import "server-only";
import { notFound } from "next/navigation";
import { GetPublicationSnapshotUsecase } from "@/server/contexts/research-fund/application/usecases/get-publication-snapshot-usecase";
import { PrismaPublicationRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-publication.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadPublication(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const snapshot = await new GetPublicationSnapshotUsecase(
    new PrismaPublicationRepository(prisma),
  ).execute(bookId);
  return { ...snapshot, target };
}
