import "server-only";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { ListPoliticiansUsecase } from "@/server/contexts/shared/application/usecases/list-politicians-usecase";
import { GetPoliticianUsecase } from "@/server/contexts/shared/application/usecases/get-politician-usecase";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadPoliticians() {
  await requireRole("research_fund");
  return new ListPoliticiansUsecase(new PrismaPoliticianRepository(prisma)).execute();
}
export async function loadPolitician(id: string) {
  await requireRole("research_fund");
  return new GetPoliticianUsecase(new PrismaPoliticianRepository(prisma)).execute(id);
}
