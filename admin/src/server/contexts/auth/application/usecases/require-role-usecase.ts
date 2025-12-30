import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/repositories/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { UserRole } from "@prisma/client";
import { validateRole } from "@/server/contexts/auth/domain/services/role-validator";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ロール検証のユースケース
 */
export class RequireRoleUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(requiredRole: UserRole): Promise<boolean> {
    try {
      const supabaseUser = await this.authProvider.getUser();
      if (!supabaseUser) {
        return false;
      }

      const dbUser = await this.userRepository.findByAuthId(supabaseUser.id);
      const currentRole: UserRole = dbUser?.role ?? "user";

      const result = validateRole(currentRole, requiredRole);
      return result.valid;
    } catch (e) {
      console.error("Require role check failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to check role: ${String(e)}`, e);
    }
  }
}
