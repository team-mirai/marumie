"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { AttachJournalDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/attach-journal-document-usecase";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/**
 * 領収書なしで作った仕訳に、あとから領収書ファイルを紐づける。
 * File はサーバーアクションの境界を越えられるが、Uint8Array に読み出してから usecase に渡す。
 * 公開中の仕訳は対象にしないので、公開ページのキャッシュは無効化しない。
 */
export async function attachJournalDocument(
  politicianId: string,
  bookId: string,
  id: string,
  updatedAt: string,
  formData: FormData,
) {
  await requireResearchFundWriter(politicianId);
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  const file = formData.get("document");
  if (!(file instanceof File)) return { success: false as const, error: "領収書を選んでください" };
  try {
    await new AttachJournalDocumentUsecase(
      new PrismaJournalReviewRepository(prisma),
      buildDocumentStorage(),
    ).execute(bookId, id, updatedAt, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      mime: file.type,
      originalFilename: file.name,
    });
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof JournalReviewError
          ? error.message
          : "領収書の紐づけに失敗しました。時間をおいて再度お試しください",
    };
  }
}
