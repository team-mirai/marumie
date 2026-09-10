import "server-only";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManagePoliticianUsecase } from "@/server/contexts/shared/application/usecases/manage-politician-usecase";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadPoliticians() {
  await requireAuth();
  return new ManagePoliticianUsecase(new PrismaPoliticianRepository(prisma)).list();
}
export async function loadPolitician(id: string) {
  await requireAuth();
  return new ManagePoliticianUsecase(new PrismaPoliticianRepository(prisma)).find(id);
}
