"use server";

import { revalidatePath } from "next/cache";
import { UpdateUserRolesUsecase } from "@/server/contexts/auth/application/usecases/update-user-roles-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

/**
 * ユーザーのロール（複数）更新アクション
 */
export async function updateUserRoles(
  userId: string,
  roles: string[],
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  await requireRole("admin");

  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new UpdateUserRolesUsecase(authProvider, userRepository);

  try {
    const user = await usecase.execute(userId, roles);
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
