import type { ReactNode } from "react";

/** プレビュー内の大見出し（団体基本情報 / 収支総括表 / 収入の部 など） */
export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[17px] font-bold text-foreground">{children}</h2>;
}
