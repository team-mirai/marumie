"use server";

import { revalidatePath } from "next/cache";
import { RegisterUserInvitationUsecase } from "@/server/contexts/auth/application/usecases/register-user-invitation-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { PrismaUserInvitationRepository } from "@/server/contexts/auth/infrastructure/repositories/prisma-user-invitation.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

/**
 * 初回ログイン前の人への招待（予約）を登録するアクション（#1882）。招待メールは送らない
 */
export async function registerUserInvitation(
  email: string,
  roles: string[],
  politicianIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole("admin");

  const usecase = new RegisterUserInvitationUsecase(
    new SupabaseAuthProvider(),
    new PrismaUserRepository(prisma),
    new PrismaUserInvitationRepository(prisma),
  );

  try {
    await usecase.execute(email, roles, politicianIds);
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: AUTH_ERROR_MESSAGES[e.code] ?? e.message };
    }
    console.error("Register user invitation failed:", e);
    return { ok: false, error: "招待の登録に失敗しました" };
  }
}
