"use server";

import { revalidatePath } from "next/cache";
import { InviteUserUsecase } from "@/server/contexts/auth/application/usecases/invite-user-usecase";
import { SupabaseAdminAuthProvider } from "@/server/contexts/auth/infrastructure/repositories/supabase-auth-provider";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ユーザー招待アクション
 */
export async function inviteUser(email: string): Promise<{ ok: boolean; error?: string }> {
  const adminAuthProvider = new SupabaseAdminAuthProvider();
  const usecase = new InviteUserUsecase(adminAuthProvider);

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
