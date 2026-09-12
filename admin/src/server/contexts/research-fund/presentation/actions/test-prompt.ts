"use server";
import "server-only";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { PromptError } from "@/server/contexts/research-fund/domain/models/prompt";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildTestPromptUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-prompts";

/**
 * 編集中（未保存でよい）のプロンプトで書類 1 枚を読み取り、抽出 JSON を返す。
 *
 * 何も保存しないので再検証（revalidate）は行わない。サーバーアクションにしているのは、
 * 読み取りに使う本文がクライアントのエディタにしか無く、LLM の呼び出しをサーバーに閉じるため。
 */
export async function testPrompt(
  politicianId: string,
  bookId: string,
  input: {
    documentId: string;
    body: string;
  },
) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await buildTestPromptUsecase().execute({
      bookId,
      documentId: input.documentId,
      officePrompt: input.body,
    });
    if (result.status === "invalid")
      return { success: false as const, error: result.errors[0].message };
    return { success: true as const, extracted: result.value };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof PromptError
          ? error.message
          : "テスト実行に失敗しました。時間をおいて再度お試しください",
    };
  }
}
