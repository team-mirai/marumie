import "server-only";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { GetPoliticianDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-politician-document-usecase";
import { PrismaDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/** 選択中の帳簿の議員の、いずれかの帳簿に属する書類の署名 URL（支払先の表記の最初の書類を開く） */
export async function loadPoliticianDocument(
  politicianId: string,
  bookId: string,
  documentId: string,
) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) return null;
  const result = await new GetPoliticianDocumentUsecase(
    new PrismaDocumentRepository(prisma),
    buildDocumentStorage(),
  ).execute({ politicianId: target.politicianId, documentId, expiresIn: 300 });
  return result.status === "valid" ? { signedUrl: result.value.signedUrl } : null;
}
