import "server-only";

// ============================================================
// 型定義（domain 層から re-export）
// ============================================================
export type { UserRole } from "@prisma/client";
export type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
export type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";
export type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";
export type { AuthErrorCode } from "@/server/contexts/auth/domain/errors/auth-error";
export { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

// ============================================================
// 認証・認可（presentation 層から re-export）
// ============================================================
export { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";

export {
  getCurrentUserRole,
  requireRole,
} from "@/server/contexts/auth/presentation/loaders/load-current-user-role";

export { loginWithPassword } from "@/server/contexts/auth/presentation/actions/login";

export {
  logout,
  signOut,
} from "@/server/contexts/auth/presentation/actions/logout";

// ============================================================
// ユーザー管理（presentation 層から re-export）
// ============================================================
export {
  getAllUsers,
  getUserByAuthId,
  createUser,
} from "@/server/contexts/auth/presentation/loaders/load-all-users";

export { updateUserRole } from "@/server/contexts/auth/presentation/actions/update-user-role";

export { inviteUser } from "@/server/contexts/auth/presentation/actions/invite-user";

export { setupPassword } from "@/server/contexts/auth/presentation/actions/setup-password";

export { exchangeCodeForSession } from "@/server/contexts/auth/presentation/actions/exchange-code-for-session";

export { completeInviteSession } from "@/server/contexts/auth/presentation/actions/complete-invite-session";
