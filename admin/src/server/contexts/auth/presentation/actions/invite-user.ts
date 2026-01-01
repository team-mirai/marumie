"use server";

import { revalidatePath } from "next/cache";
import { InviteUserUsecase } from "@/server/contexts/auth/application/usecases/invite-user-usecase";
import {
  SupabaseAuthProvider,
  SupabaseAdminAuthProvider,
} from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ユーザー招待アクション
 */
export async function inviteUser(email: string): Promise<{ ok: boolean; error?: string }> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const adminAuthProvider = new SupabaseAdminAuthProvider();
  const usecase = new InviteUserUsecase(authProvider, userRepository, adminAuthProvider);

  try {
    await usecase.execute(email);
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "招待に失敗しました" };
  }
}
