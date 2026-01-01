"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { UpdateUserRoleUsecase } from "@/server/contexts/auth/application/usecases/update-user-role-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * ユーザーロール更新アクション
 */
export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new UpdateUserRoleUsecase(authProvider, userRepository);

  try {
    const user = await usecase.execute(userId, role);
    revalidatePath("/users");
    return { ok: true, user };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "ロールの更新に失敗しました" };
  }
}
