import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";

interface UserRoleBadge {
  label: string;
  /** ピルバッジの色クラス。admin は teal、user はグレー（ハンドオフ「状態バッジは teal / 赤 / グレーのピル」） */
  className: string;
}

/**
 * ユーザーロールをバッジ表示用のラベルと色クラスに解決する。
 * ユーザー情報画面とユーザー管理画面で同じ見た目を共有するための単一の変換点。
 */
export function resolveUserRoleBadge(role: UserRole): UserRoleBadge {
  switch (role) {
    case "admin":
      return {
        label: "admin",
        className: "border-primary-active text-primary-active bg-accent",
      };
    case "user":
      return {
        label: "user",
        className: "border-subtle-foreground text-muted-foreground bg-secondary",
      };
  }
}
