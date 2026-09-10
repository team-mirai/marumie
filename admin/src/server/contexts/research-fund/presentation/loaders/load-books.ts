import "server-only";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageBookUsecase } from "@/server/contexts/research-fund/application/usecases/manage-book-usecase";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
export async function loadBooks(politicianId: string) {
  await requireAuth();
  return new ManageBookUsecase(new PrismaBookRepository(prisma)).list(politicianId);
}
