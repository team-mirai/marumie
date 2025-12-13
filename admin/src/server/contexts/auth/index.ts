import "server-only";

// ============================================================
// 型定義
// ============================================================
export type { UserRole } from "@prisma/client";

export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  role: import("@prisma/client").UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 認証・認可（既存を re-export）
// ============================================================
export {
  getCurrentUser,
  getCurrentUserRole,
  requireRole,
} from "@/server/contexts/auth/application/roles";

export {
  loginWithPassword,
  logout,
} from "@/server/contexts/auth/application/login";

// ============================================================
// ユーザー管理（新規追加）
// ============================================================
export {
  getAllUsers,
  getUserByAuthId,
  createUser,
  updateUserRole,
  inviteUser,
  setupPassword,
  signOut,
  exchangeCodeForSession,
} from "@/server/contexts/auth/application/users";
