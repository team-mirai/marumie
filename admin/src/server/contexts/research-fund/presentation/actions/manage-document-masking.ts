"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import {
  buildProcessDocumentMaskingUsecase,
  buildRequestDocumentMaskingUsecase,
} from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";

/**
 * 未作成の書類の公開用の版を少数だけ作る（#1802）。
 * 帳簿の画面は hasMore が true の間これを繰り返し呼ぶ（キュー基盤は使わない）。
 */
export async function processDocumentMasking(politicianId: string, bookId: string) {
  await requireResearchFundWriter(politicianId);
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await buildProcessDocumentMaskingUsecase().execute({ bookId });
    // 何も作らなかった呼び出しで画面を取り直さない（入力中の画面を巻き込まないため）
    if (result.processed > 0) revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch {
    return {
      success: false as const,
      error: "公開用の版の作成に失敗しました。時間をおいて再度お試しください",
    };
  }
}

/** 書類の公開用の版を作る・作り直す。作り直すと、新しい版ができた時点で前の版は置き換わる */
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
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "公開用の版の作成を受け付けられませんでした。時間をおいて再度お試しください",
    };
  }
}
