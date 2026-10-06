"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { SavePayeeUsecase } from "@/server/contexts/research-fund/application/usecases/save-payee-usecase";
import {
  PayeeError,
  type PayeeFormInput,
} from "@/server/contexts/research-fund/domain/models/payee";
import { PrismaPayeeRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-payee.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/**
 * 支払先を作成する（id が null）・編集する。対象は選択中の帳簿の議員の支払先だけ。
 * 支払先は公開ページに出さないので、webapp のキャッシュは無効化しない。
 */
export async function savePayee(
  politicianId: string,
  bookId: string,
  id: string | null,
  input: PayeeFormInput,
) {
  await requireAuth();
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const payee = await new SavePayeeUsecase(new PrismaPayeeRepository(prisma)).execute(
      target.politicianId,
      id,
      input,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const, payee };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof PayeeError ? error.message : "支払先の保存に失敗しました",
    };
  }
}
