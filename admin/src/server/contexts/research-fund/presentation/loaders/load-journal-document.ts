import "server-only";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { GetDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-document-usecase";
import { PrismaDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadJournalDocument(
  politicianId: string,
  bookId: string,
  documentId: string,
) {
  if (!(await requireJournalTarget(politicianId, bookId))) return null;
  const result = await new GetDocumentUsecase(
    new PrismaDocumentRepository(prisma),
    buildDocumentStorage(),
  ).execute({ bookId, documentId, expiresIn: 300 });
  return result.status === "valid" ? { signedUrl: result.value.signedUrl } : null;
}
