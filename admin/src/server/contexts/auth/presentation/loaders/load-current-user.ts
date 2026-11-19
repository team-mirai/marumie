import "server-only";

import { cache } from "react";
import { GetCurrentUserUsecase } from "@/server/contexts/auth/application/usecases/get-current-user-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";

/**
 * 現在のユーザーを取得するローダー
 *
 * レイアウト・各ページのロールガード・ローダーが同じリクエストの中で何度も呼ぶため、
 * サーバーコンポーネントの 1 回のレンダリングの中では結果を使い回す。
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new GetCurrentUserUsecase(authProvider, userRepository);

  return usecase.execute();
});
