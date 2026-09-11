import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { GetDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-document-usecase";
import { PrismaDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document.repository";
import { SupabaseDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-document-storage";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadJournalDocument(
  politicianId: string,
  bookId: string,
  documentId: string,
) {
  if (!(await requireJournalTarget(politicianId, bookId))) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.RESEARCH_FUND_DOCUMENT_BUCKET;
  if (!url || !key || !bucket) throw new Error("領収書ストレージが未設定です");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await new GetDocumentUsecase(
    new PrismaDocumentRepository(prisma),
    new SupabaseDocumentStorage(client, bucket),
  ).execute({ bookId, documentId, expiresIn: 300 });
  return result.status === "valid" ? { signedUrl: result.value.signedUrl } : null;
}
