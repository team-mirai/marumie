"use server";

import { CompleteInviteSessionUsecase } from "@/server/contexts/auth/application/usecases/complete-invite-session-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/repositories/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * 招待セッション完了アクション
 */
export async function completeInviteSession(
  accessToken: string,
  refreshToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new CompleteInviteSessionUsecase(authProvider, userRepository);

  try {
    await usecase.execute(accessToken, refreshToken);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "セッションの設定に失敗しました" };
  }
}
