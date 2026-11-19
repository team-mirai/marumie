"use client";
import { createContext, useContext } from "react";
import Link from "next/link";
import { Button } from "@/client/components/ui";
import { cn } from "@/client/lib";

/**
 * 表示中の議員室の調査研究費に書き込めるか（#1773）。
 * 閲覧は全議員室に開いているが、書き込みは担当の議員室だけなので、担当外の画面では
 * 書き込み用のボタン・フォームを（非表示ではなく）無効にする。サーバー側の拒否はアクションのガードが担う。
 */
const Context = createContext(true);

export function ResearchFundWriteAccessProvider({
  canWrite,
  children,
}: {
  canWrite: boolean;
  children: React.ReactNode;
}) {
  return <Context.Provider value={canWrite}>{children}</Context.Provider>;
}

/** 担当外の議員室を見ていて、書き込めないなら true */
export function useResearchFundReadOnly(): boolean {
  return !useContext(Context);
}

/**
 * 書き込み用のボタン・フォームをまとめて囲み、担当外なら中の button / input / select / textarea をすべて無効にする。
 * レイアウトに影響しないよう fieldset 自体の箱は作らない（display: contents）。
 * リンクは無効にならないので、閲覧のための遷移は囲んでも使える。
 */
export function WriteFieldset({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const readOnly = useResearchFundReadOnly();
  return (
    <fieldset disabled={readOnly} className={cn("contents", className)}>
      {children}
    </fieldset>
  );
}

/**
 * 書き込み用の画面（新規作成など）へのリンクボタン。担当外なら遷移させず、無効のボタンとして出す。
 */
export function WriteLinkButton({
  href,
  children,
  ...props
}: { href: string; children: React.ReactNode } & Pick<
  React.ComponentProps<typeof Button>,
  "variant" | "size" | "className"
>) {
  const readOnly = useResearchFundReadOnly();
  if (readOnly)
    return (
      <Button {...props} disabled>
        {children}
      </Button>
    );
  return (
    <Button {...props} asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
