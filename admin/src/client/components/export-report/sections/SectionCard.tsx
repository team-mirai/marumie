import type { ReactNode } from "react";
import { cn } from "@/client/lib";

interface SectionCardProps {
  title: string;
  /** 様式ID（SYUUSHI07_03 / KUBUN1 など）。Poppins の英字ラベルとして表示する */
  formId: string;
  /** ヘッダー右側に置く補足（合計金額など） */
  meta?: ReactNode;
  /** データが無いセクションは見出しを控えめな色にする */
  muted?: boolean;
  children: ReactNode;
}

/** 白カード + 黒1px枠 + 角丸8px のセクション枠（ハンドオフ「6. その他の画面」の語彙） */
export function SectionCard({ title, formId, meta, muted = false, children }: SectionCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border bg-background px-4 py-3",
          muted && "text-muted-foreground",
        )}
      >
        <h3 className="text-[15px] font-bold">
          {title}
          <span className="ml-2 font-latin text-xs font-semibold tracking-[0.06em] text-subtle-foreground">
            {formId}
          </span>
        </h3>
        {meta && <div className="text-[13px]">{meta}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
