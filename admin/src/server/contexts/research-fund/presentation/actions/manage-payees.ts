"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { DeletePayeeUsecase } from "@/server/contexts/research-fund/application/usecases/delete-payee-usecase";
import { DeletePayeeAliasUsecase } from "@/server/contexts/research-fund/application/usecases/delete-payee-alias-usecase";
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

/**
 * 支払先に記録された表記を削除する。対象は選択中の帳簿の議員の支払先の表記だけ。
 * 削除した表記はそれ以降の書類の照合に使われない。支払先と同じく webapp のキャッシュは無効化しない。
 */
export async function deletePayeeAlias(
  politicianId: string,
  bookId: string,
  payeeId: string,
  aliasId: string,
) {
  await requireAuth();
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    await new DeletePayeeAliasUsecase(new PrismaPayeeRepository(prisma)).execute(
      target.politicianId,
      payeeId,
      aliasId,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof PayeeError ? error.message : "表記の削除に失敗しました",
    };
  }
}

/**
 * 支払先を削除する。対象は選択中の帳簿の議員の支払先だけ。公開中の仕訳が紐づく支払先は削除しない。
 * 紐づいていた公開中でない仕訳は支払先が未設定に戻る。支払先は公開内容に影響しないので、webapp のキャッシュは無効化しない。
 */
export async function deletePayee(politicianId: string, bookId: string, payeeId: string) {
  await requireAuth();
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const { unlinkedCount } = await new DeletePayeeUsecase(
      new PrismaPayeeRepository(prisma),
    ).execute(target.politicianId, payeeId);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, unlinkedCount };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof PayeeError ? error.message : "支払先の削除に失敗しました",
    };
  }
}
