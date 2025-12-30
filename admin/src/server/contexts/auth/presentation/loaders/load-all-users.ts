import "server-only";

import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { GetAllUsersUsecase } from "@/server/contexts/auth/application/usecases/get-all-users-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

const CACHE_REVALIDATE_SECONDS = 60;

/**
 * ユーザー一覧を取得する内部関数（キャッシュ対象）
 */
const fetchAllUsers = unstable_cache(
  async (): Promise<User[]> => {
    const userRepository = new PrismaUserRepository(prisma);
    return await userRepository.findAll();
  },
  ["all-users"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["users"] },
);

/**
 * 全ユーザー一覧を取得するローダー（admin権限必須）
 * 認可チェック後にキャッシュされたユーザー一覧を返す
 */
export async function loadAllUsers(): Promise<User[]> {
  const authProvider = new SupabaseAuthProvider();
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new GetAllUsersUsecase(authProvider, userRepository);

  try {
    // 認可チェックのみ実行（キャッシュなし）
    await usecase.checkPermission();
    // 認可が通った場合のみ、キャッシュされたデータを返す
    return await fetchAllUsers();
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.code === "AUTH_FAILED" || e.code === "INSUFFICIENT_PERMISSION") {
        redirect("/login");
      }
    }
    throw e;
  }
}
