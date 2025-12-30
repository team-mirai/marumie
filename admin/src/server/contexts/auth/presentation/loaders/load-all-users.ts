import "server-only";

import { GetAllUsersUsecase } from "@/server/contexts/auth/application/usecases/get-all-users-usecase";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";
import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * 全ユーザー一覧を取得するローダー
 */
export async function getAllUsers(): Promise<User[]> {
  const userRepository = new PrismaUserRepository(prisma);
  const usecase = new GetAllUsersUsecase(userRepository);

  return usecase.execute();
}

/**
 * authId でユーザーを取得するローダー
 */
export async function getUserByAuthId(authId: string): Promise<User | null> {
  const userRepository = new PrismaUserRepository(prisma);
  return userRepository.findByAuthId(authId);
}

/**
 * ユーザーを作成するローダー
 */
export async function createUser(data: {
  authId: string;
  email: string;
  role?: "user" | "admin";
}): Promise<User> {
  const userRepository = new PrismaUserRepository(prisma);
  return userRepository.create(data);
}
