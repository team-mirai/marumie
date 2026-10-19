"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import {
  buildRequestDocumentMaskingUsecase,
  notifyDocumentMasking,
} from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";

/**
 * 書類の公開用の版を作る・作り直す。作り直すと、新しい版ができた時点で前の版は置き換わる。
 * 作成はキューから呼ばれたサーバー側の処理が行うので、画面を開いていなくても進む（#1812）
 */
export async function requestDocumentMasking(
  politicianId: string,
  bookId: string,
  documentId: string,
) {
  await requireResearchFundWriter(politicianId);
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await buildRequestDocumentMaskingUsecase().execute({ bookId, documentId });
    if (result.status === "invalid")
      return { success: false as const, error: result.errors[0].message };
    await notifyDocumentMasking();
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "公開用の版の作成を受け付けられませんでした。時間をおいて再度お試しください",
    };
  }
}
