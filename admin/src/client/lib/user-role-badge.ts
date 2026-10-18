import type { UserRole } from "@/server/contexts/auth/domain/models/user-role";

interface UserRoleBadge {
  label: string;
  /** ピルバッジの色クラス。admin は teal、業務ロールはグレー（ハンドオフ「状態バッジは teal / 赤 / グレーのピル」） */
  className: string;
}

const NEUTRAL = "border-subtle-foreground text-muted-foreground bg-secondary";

/**
 * ユーザーロールをバッジ表示用のラベルと色クラスに解決する。
 * サイドバー下部とユーザー管理画面で同じ見た目を共有するための単一の変換点。
 */
export function resolveUserRoleBadge(role: UserRole): UserRoleBadge {
  switch (role) {
    case "admin":
      return {
        label: "admin",
        className: "border-primary-active text-primary-active bg-accent",
      };
    case "political_fund":
      return { label: "政治資金", className: NEUTRAL };
    case "research_fund":
      return { label: "調査研究費", className: NEUTRAL };
  }
}
