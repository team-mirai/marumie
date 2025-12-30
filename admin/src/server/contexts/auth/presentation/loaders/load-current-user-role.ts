import "server-only";

import type { UserRole } from "@prisma/client";
import { GetCurrentUserRoleUsecase } from "@/server/contexts/auth/application/usecases/get-current-user-role-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";

/**
 * 現在のユーザーロールを取得するローダー
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new GetCurrentUserRoleUsecase(authProvider, userRepository);

  return usecase.execute();
}
