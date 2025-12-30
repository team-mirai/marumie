import "server-only";

import type {
  User,
  UserRepository,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * ユーザー作成のユースケース
 */
export class CreateUserUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(data: { authId: string; email: string; role?: "user" | "admin" }): Promise<User> {
    return this.userRepository.create(data);
  }
}
