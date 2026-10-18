import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { loadAssignedPoliticianIds } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { GetAdminTargetsUsecase } from "@/server/contexts/shared/application/usecases/get-admin-targets-usecase";
import { PrismaAdminTargetRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-admin-target.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export const loadAdminTargets = cache(async () => {
  const user = await requireRole("political_fund", "research_fund");
  const cookieName = `admin-target-${user.id}`;
  const [key, assignedPoliticianIds] = await Promise.all([
    cookies().then((store) => store.get(cookieName)?.value),
    loadAssignedPoliticianIds(user.id),
  ]);
  const data = await new GetAdminTargetsUsecase(new PrismaAdminTargetRepository(prisma)).execute(
    key,
    new Date().getFullYear(),
    user.roles,
    assignedPoliticianIds,
  );
  return { ...data, cookieName };
});
