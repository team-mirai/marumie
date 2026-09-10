import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { GetAdminTargetsUsecase } from "@/server/contexts/shared/application/usecases/get-admin-targets-usecase";
import { PrismaAdminTargetRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-admin-target.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export const loadAdminTargets = cache(async () => {
  const user = await requireAuth();
  const cookieName = `admin-target-${user.id}`;
  const key = (await cookies()).get(cookieName)?.value;
  const data = await new GetAdminTargetsUsecase(new PrismaAdminTargetRepository(prisma)).execute(
    key,
    new Date().getFullYear(),
  );
  return { ...data, cookieName };
});
