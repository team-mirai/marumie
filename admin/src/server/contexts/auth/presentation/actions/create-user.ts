import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import { CreateUserUsecase } from "@/server/contexts/auth/application/usecases/create-user-usecase";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * ユーザーを作成するアクション
 */
export async function createUser(data: {
  authId: string;
  email: string;
  role?: "user" | "admin";
}): Promise<User> {
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new CreateUserUsecase(userRepository);
  return usecase.execute(data);
}
