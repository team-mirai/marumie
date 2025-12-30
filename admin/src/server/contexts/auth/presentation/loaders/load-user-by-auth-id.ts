import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { GetUserByAuthIdUsecase } from "@/server/contexts/auth/application/usecases/get-user-by-auth-id-usecase";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * authId でユーザーを取得するローダー
 */
export async function getUserByAuthId(authId: string): Promise<User | null> {
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new GetUserByAuthIdUsecase(userRepository);
  return usecase.execute(authId);
}
