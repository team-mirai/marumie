"use server";

import { revalidatePath } from "next/cache";
import { UpdateUserAssignmentsUsecase } from "@/server/contexts/auth/application/usecases/update-user-assignments-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

/**
 * ユーザーが担当する議員の付け替えアクション（#1773）
 */
export async function updateUserAssignments(
  userId: string,
  politicianIds: string[],
): Promise<{ ok: true; assignedPoliticianIds: string[] } | { ok: false; error: string }> {
  await requireRole("admin");

  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new UpdateUserAssignmentsUsecase(authProvider, userRepository);

  try {
    const assignedPoliticianIds = await usecase.execute(userId, politicianIds);
    // 担当は対象の初期選択・調査研究費の画面の書き込み可否に効くので、ユーザー管理以外も再検証する
    revalidatePath("/(auth)", "layout");
    return { ok: true, assignedPoliticianIds };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "担当の更新に失敗しました" };
  }
}
