import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { RequireRoleUsecase } from "@/server/contexts/auth/application/usecases/require-role-usecase";

/**
 * ロール検証を行うローダー
 */
export async function requireRole(requiredRole: UserRole): Promise<boolean> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new RequireRoleUsecase(authProvider, userRepository);
  return usecase.execute(requiredRole);
}
