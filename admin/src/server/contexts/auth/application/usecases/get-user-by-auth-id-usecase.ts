import "server-only";

import type {
  User,
  UserRepository,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * authId でユーザーを取得するユースケース
 */
export class GetUserByAuthIdUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(authId: string): Promise<User | null> {
    return this.userRepository.findByAuthId(authId);
  }
}
