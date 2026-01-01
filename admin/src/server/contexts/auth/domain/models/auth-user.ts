import "server-only";

import type { User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";

/**
 * 認証済みユーザー（DB に永続化されたユーザー情報）
 * shared コンテキストの User 型のエイリアス
 */
export type AuthUser = User;
// UserRole は user-role.ts で独自定義しているため、そちらから re-export
