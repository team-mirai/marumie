"use server";

import { ExchangeCodeForSessionUsecase } from "@/server/contexts/auth/application/usecases/exchange-code-for-session-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * OAuth コールバック処理アクション
 */
export async function exchangeCodeForSession(
  code: string,
): Promise<{ ok: true; user: User; isNewUser: boolean } | { ok: false; error: string }> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new ExchangeCodeForSessionUsecase(authProvider, userRepository);

  try {
    const result = await usecase.execute(code);
    return { ok: true, user: result.user, isNewUser: result.isNewUser };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "認証に失敗しました" };
  }
}
