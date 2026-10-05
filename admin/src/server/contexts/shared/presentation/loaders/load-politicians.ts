import "server-only";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ListPoliticiansUsecase } from "@/server/contexts/shared/application/usecases/list-politicians-usecase";
import { GetPoliticianUsecase } from "@/server/contexts/shared/application/usecases/get-politician-usecase";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadPoliticians() {
  await requireAuth();
  return new ListPoliticiansUsecase(new PrismaPoliticianRepository(prisma)).execute();
}
export async function loadPolitician(id: string) {
  await requireAuth();
  return new GetPoliticianUsecase(new PrismaPoliticianRepository(prisma)).execute(id);
}
