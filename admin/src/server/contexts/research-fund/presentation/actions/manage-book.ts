"use server";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { revalidatePath } from "next/cache";
import type { BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { CreateBookUsecase } from "@/server/contexts/research-fund/application/usecases/create-book-usecase";
import { SetLegalCategoryOverrideAllowedUsecase } from "@/server/contexts/research-fund/application/usecases/set-legal-category-override-allowed-usecase";
import { UpdateBookUsecase } from "@/server/contexts/research-fund/application/usecases/update-book-usecase";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
function publicErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof BookError)) return fallback;
  switch (error.code) {
    case "INVALID_ID":
      return "IDが不正です";
    case "DUPLICATE_BOOK":
      return "この議員の年度帳簿は既に存在します";
    case "RF_INVALID_BOOK_YEAR":
      return "年度は1900〜9999の整数で指定してください";
    case "RF_INVALID_BOOK_METADATA":
      return "帳簿情報の入力が不正です";
    case "RF_INVALID_DATE":
      return "時点の日付を正しく入力してください";
    case "RF_INVALID_LEGAL_CATEGORY_OVERRIDE":
      return error.message;
    default:
      return fallback;
  }
}

export async function createBook(politicianId: string, year: number) {
  await requireResearchFundWriter(politicianId);
  try {
    await new CreateBookUsecase(new PrismaBookRepository(prisma)).execute(politicianId, year);
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: publicErrorMessage(error, "作成に失敗しました"),
    };
  }
}
export async function updateBook(politicianId: string, bookId: string, input: BookMetadata) {
  await requireResearchFundWriter(politicianId);
  try {
    const { cacheWarning } = await new UpdateBookUsecase(
      new PrismaBookRepository(prisma),
      new WebappCacheInvalidator(),
    ).execute(politicianId, bookId, input);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return {
      success: false as const,
      error: publicErrorMessage(error, "保存に失敗しました"),
    };
  }
}

/**
 * 帳簿の法定区分の上書きを許可・取り消しする（#1880）。管理者（admin）だけが使える。
 * 調査研究費の書き込みのガードを先に通したうえで、admin ロールを求める（担当の議員室の担当者でも admin でなければ拒否する）。
 */
export async function setLegalCategoryOverrideAllowed(
  politicianId: string,
  bookId: string,
  allowed: boolean,
) {
  await requireResearchFundWriter(politicianId);
  await requireRole("admin");
  try {
    const result = await new SetLegalCategoryOverrideAllowedUsecase(
      new PrismaBookRepository(prisma),
    ).execute(politicianId, bookId, allowed);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: publicErrorMessage(error, "法定区分の上書きの許可を変更できませんでした"),
    };
  }
}
