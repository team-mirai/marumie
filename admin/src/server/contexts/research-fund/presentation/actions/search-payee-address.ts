"use server";
import "server-only";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { SearchPayeeAddressUsecase } from "@/server/contexts/research-fund/application/usecases/search-payee-address-usecase";
import type { PayeeAddressSearchResult } from "@/server/contexts/research-fund/domain/models/payee-address-search";
import { VercelAIPayeeAddressSearchGateway } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-payee-address-search-gateway";
import { PrismaAddressSearchPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-address-search-prompt.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/**
 * 支払先フォームの住所検索。帳簿の議員の住所検索プロンプトを使う。
 * 検索だけで保存は伴わないため再検証はしない（ユーザー操作に即応する検索としてクライアントから呼ぶ）。
 */
export async function searchPayeeAddress(
  politicianId: string,
  bookId: string,
  name: string,
  hint?: string,
): Promise<PayeeAddressSearchResult> {
  await requireAuth();
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target)
    return {
      success: false,
      error: {
        type: "API_ERROR",
        message: "現在の対象帳簿を選択し直してください",
        retryable: false,
      },
    };
  try {
    return await new SearchPayeeAddressUsecase(
      new PrismaAddressSearchPromptRepository(prisma),
      new VercelAIPayeeAddressSearchGateway(),
    ).execute(target.politicianId, name, hint);
  } catch (error) {
    console.error("Error searching payee address:", error);
    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT"))
        return {
          success: false,
          error: {
            type: "TIMEOUT",
            message: "検索がタイムアウトしました。再度お試しください。",
          },
        };
      if (error.message.includes("rate") || error.message.includes("429"))
        return {
          success: false,
          error: { type: "RATE_LIMIT", retryAfter: 60 },
        };
    }
    return {
      success: false,
      error: {
        type: "API_ERROR",
        // API の生のエラーメッセージは画面に出さない（詳細は上のサーバーログに残す）
        message: "住所検索に失敗しました。時間をおいて再度お試しください。",
        retryable: true,
      },
    };
  }
}
