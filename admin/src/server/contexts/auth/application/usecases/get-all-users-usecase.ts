import "server-only";

import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * 全ユーザー一覧取得のユースケース
 */
export class GetAllUsersUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<User[]> {
    try {
      return await this.userRepository.findAll();
    } catch (e) {
      console.error("Get all users failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to get all users: ${String(e)}`, e);
    }
  }
}
