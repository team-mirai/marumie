import { cn } from "@/client/lib";

interface BrandWordmarkProps {
  className?: string;
}

/**
 * 「みらいまる見え政治資金」+「ADMIN CONSOLE」の文字ヘッダー。
 * ロゴ画像は置かず文字のみで表現する（ブランドガイド上、ロゴの改変・多用を避けるため）。
 * サイドバーと公開画面（ログイン等）のカードで同じ表現を共有する。
 * 値はデザインハンドオフ（docs/reference/design_handoff_admin_redesign/README.md「1. サイドバー」）が正。
 */
export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="whitespace-nowrap text-[13px] font-bold tracking-[0.06em] text-foreground">
        みらいまる見え政治資金
      </div>
      <div className="mt-0.5 font-latin text-[10px] font-semibold tracking-[0.14em] text-primary-hover">
        ADMIN CONSOLE
      </div>
    </div>
  );
}
