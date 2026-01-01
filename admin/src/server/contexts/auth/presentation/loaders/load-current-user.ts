import "server-only";

import { GetCurrentUserUsecase } from "@/server/contexts/auth/application/usecases/get-current-user-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";

/**
 * 現在のユーザーを取得するローダー
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new GetCurrentUserUsecase(authProvider, userRepository);

  return usecase.execute();
}
