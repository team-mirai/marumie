"use server";

import { revalidatePath } from "next/cache";
import { CancelUserInvitationUsecase } from "@/server/contexts/auth/application/usecases/cancel-user-invitation-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { PrismaUserInvitationRepository } from "@/server/contexts/auth/infrastructure/repositories/prisma-user-invitation.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

/**
 * 未使用の招待（#1882）を取り消すアクション
 */
export async function cancelUserInvitation(
  invitationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("admin");

  const usecase = new CancelUserInvitationUsecase(
    new SupabaseAuthProvider(),
    new PrismaUserRepository(prisma),
    new PrismaUserInvitationRepository(prisma),
  );

  try {
    await usecase.execute(invitationId);
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: AUTH_ERROR_MESSAGES[e.code] ?? e.message };
    }
    console.error("Cancel user invitation failed:", e);
    return { ok: false, error: "招待の取り消しに失敗しました" };
  }
}
