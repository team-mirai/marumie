"use server";
import "server-only";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { PrepareDocumentUploadsUsecase } from "@/server/contexts/research-fund/application/usecases/prepare-document-uploads-usecase";
import type { DocumentUploadTarget } from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

type PrepareDocumentUploadsResponse =
  | { success: true; targets: DocumentUploadTarget[] }
  | { success: false; error: string };

/**
 * 書類をブラウザから原本のバケットへ直接置くための署名付き URL を、ファイルごとに発行する（#1824）。
 * ファイル本体は Vercel の関数のリクエストボディ上限（4.5MB）を超えうるので、この action には載せない。
 * ストレージにファイルを置くだけでデータは変わらない（登録は createScanBatch / attachJournalDocument が行う）ので、
 * 再検証はしない。
 */
export async function prepareDocumentUploads(
  politicianId: string,
  bookId: string,
  files: { mime: string; size: number }[],
): Promise<PrepareDocumentUploadsResponse> {
  const user = await requireResearchFundWriter(politicianId);
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false, error: "現在の対象帳簿を選択し直してください" };
  if (!Array.isArray(files)) return { success: false, error: "書類を1枚以上選んでください" };
  try {
    const result = await new PrepareDocumentUploadsUsecase(buildDocumentStorage()).execute({
      owner: { politicianId, userId: user.id },
      files: files.map((file) => ({ mime: String(file?.mime), size: Number(file?.size) })),
    });
    if (result.status === "invalid") return { success: false, error: result.errors[0].message };
    return { success: true, targets: result.value };
  } catch (error) {
    console.error("Prepare research fund document uploads error:", error);
    return {
      success: false,
      error: "書類のアップロードの準備に失敗しました。時間をおいて再度お試しください",
    };
  }
}
