import "server-only";

import { redirect } from "next/navigation";
import { GetUserInvitationsUsecase } from "@/server/contexts/auth/application/usecases/get-user-invitations-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { PrismaUserInvitationRepository } from "@/server/contexts/auth/infrastructure/repositories/prisma-user-invitation.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { UserInvitation } from "@/server/contexts/auth/domain/models/user-invitation";

/**
 * 未使用の招待（#1882）の一覧を取得するローダー（admin権限必須）
 */
export async function loadUserInvitations(): Promise<UserInvitation[]> {
  const usecase = new GetUserInvitationsUsecase(
    new SupabaseAuthProvider(),
    new PrismaUserRepository(prisma),
    new PrismaUserInvitationRepository(prisma),
  );

  try {
    return await usecase.execute();
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.code === "AUTH_FAILED" || e.code === "INSUFFICIENT_PERMISSION") {
        redirect("/login");
      }
    }
    throw e;
  }
}
