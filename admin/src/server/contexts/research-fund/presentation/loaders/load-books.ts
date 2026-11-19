import "server-only";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { ListBooksUsecase } from "@/server/contexts/research-fund/application/usecases/list-books-usecase";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
export async function loadBooks(politicianId: string) {
  await requireRole("research_fund");
  return new ListBooksUsecase(new PrismaBookRepository(prisma)).execute(politicianId);
}
