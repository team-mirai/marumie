import "server-only";

import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * 認証済みユーザー（DB に永続化されたユーザー情報）
 * shared コンテキストの User 型のエイリアス
 */
export type AuthUser = User;

export type { UserRole } from "@prisma/client";
