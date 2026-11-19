import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/client/components/ui";
import { BrandWordmark } from "@/client/components/layout/BrandWordmark";
import { cn } from "@/client/lib";

interface PublicAuthCardProps {
  /** カードの見出し。例: "ログイン" */
  title: string;
  /** 見出し下の補足文 */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * サイドバーなしの公開画面（ログイン・パスワード再設定・初期セットアップ）で使う白カード。
 * 黒1px枠・角丸8pxのカード上部に文字ヘッダー（BrandWordmark）を置き、
 * その下に teal-soft 下線付きの見出しと本文を並べる。
 */
export function PublicAuthCard({ title, description, children, className }: PublicAuthCardProps) {
  return (
    <Card className={cn("w-full max-w-md gap-0 py-8", className)}>
      <CardHeader className="gap-0 px-8">
        <BrandWordmark />
        <h1 className="mt-6 text-[22px] font-bold leading-[1.4] tracking-[0.06em] text-foreground">
          <span className="underline decoration-teal-soft decoration-[3px] underline-offset-[6px]">
            {title}
          </span>
        </h1>
        {description && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="mt-6 px-8">{children}</CardContent>
    </Card>
  );
}
