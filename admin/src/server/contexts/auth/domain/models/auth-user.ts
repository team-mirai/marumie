import "server-only";

import type { UserRole } from "@prisma/client";

/**
 * 認証済みユーザー（DB に永続化されたユーザー情報）
 * shared コンテキストの User と同等だが、auth コンテキストで使用する型として再定義
 */
export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type { UserRole } from "@prisma/client";
