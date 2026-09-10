"use server";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { revalidatePath } from "next/cache";
import type { BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageBookUsecase } from "@/server/contexts/research-fund/application/usecases/manage-book-usecase";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
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
    default:
      return fallback;
  }
}

export async function createBook(politicianId: string, year: number) {
  await requireAuth();
  try {
    await new ManageBookUsecase(new PrismaBookRepository(prisma)).create(politicianId, year);
    revalidatePath(`/politicians/${politicianId}/books`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: publicErrorMessage(error, "作成に失敗しました"),
    };
  }
}
export async function updateBook(politicianId: string, bookId: string, input: BookMetadata) {
  await requireAuth();
  try {
    await new ManageBookUsecase(new PrismaBookRepository(prisma)).update(
      politicianId,
      bookId,
      input,
    );
    revalidatePath(`/politicians/${politicianId}/books`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: publicErrorMessage(error, "保存に失敗しました"),
    };
  }
}
