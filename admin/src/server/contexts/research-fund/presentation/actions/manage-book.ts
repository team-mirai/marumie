"use server";
import { revalidatePath } from "next/cache";
import type { BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageBookUsecase } from "@/server/contexts/research-fund/application/usecases/manage-book-usecase";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
export async function createBook(politicianId: string, year: number) {
  await requireAuth();
  try {
    await new ManageBookUsecase(new PrismaBookRepository(prisma)).create(politicianId, year);
    revalidatePath(`/politicians/${politicianId}/books`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "作成に失敗しました",
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
      error: error instanceof Error ? error.message : "保存に失敗しました",
    };
  }
}
