import type { ReactNode } from "react";
import { cn } from "@/client/lib";

interface PageHeaderProps {
  /** 英字ラベル（Poppins）。例: "Transactions" */
  label: string;
  /** h1 見出し。例: "取引一覧" */
  title: ReactNode;
  /** 見出し下の補足文 */
  description?: ReactNode;
  /** 見出し右側に置くアクション（新規作成ボタンなど） */
  actions?: ReactNode;
  className?: string;
}

/**
 * 認証後の全画面で使うページヘッダー。
 * 英字ラベル + teal-soft 下線付き h1 の構成はデザインハンドオフ
 * （docs/reference/design_handoff_admin_redesign/README.md）が正。
 * コンテンツカードの外（ページ背景の上）に置く。
 */
export function PageHeader({ label, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <p className="font-latin text-[13px] font-semibold tracking-[0.1em] text-primary-hover">
          {label}
        </p>
        <h1 className="mt-0.5 text-[26px] font-bold leading-[1.4] tracking-[0.06em] text-foreground">
          <span className="underline decoration-teal-soft decoration-[3px] underline-offset-[6px]">
            {title}
          </span>
        </h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
