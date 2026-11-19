"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { ReplaceJournalDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/replace-journal-document-usecase";
import type { DocumentUpload } from "@/server/contexts/research-fund/domain/models/document-upload";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { notifyDocumentMasking } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/**
 * 仕訳に紐づいた書類のファイルを差し替える（#1827）。
 * 書類はブラウザがストレージに置いたもの（prepareDocumentUploads で発行したキー）を受け取る（#1824）。
 * 公開中の仕訳は対象にしないので、公開ページのキャッシュは無効化しない。
 */
export async function replaceJournalDocument(
  politicianId: string,
  bookId: string,
  id: string,
  updatedAt: string,
  upload: DocumentUpload,
) {
  const user = await requireResearchFundWriter(politicianId);
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  if (!upload?.uploadKey)
    return { success: false as const, error: "差し替える書類を選んでください" };
  try {
    await new ReplaceJournalDocumentUsecase(
      new PrismaJournalReviewRepository(prisma),
      buildDocumentStorage(),
    ).execute(
      bookId,
      id,
      updatedAt,
      { uploadKey: String(upload.uploadKey), originalFilename: String(upload.originalFilename) },
      { politicianId, userId: user.id },
    );
    // 差し替えた原本から公開用の版を、画面を開いていなくても作り始める（#1812）
    await notifyDocumentMasking();
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof JournalReviewError
          ? error.message
          : "書類の差し替えに失敗しました。時間をおいて再度お試しください",
    };
  }
}
