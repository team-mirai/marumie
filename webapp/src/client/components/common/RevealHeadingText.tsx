import type { ReactNode } from "react";

/**
 * 画面に入るときに下からせり上がる見出しの 1 行（v9 の data-hqrv="mask" の .ln）。
 * 見出しの要素に `data-reveal="mask"` を付け、文言をこれで包む。隠すのは RevealOnScroll が印を付けたときだけなので、
 * JS が動かないときや「動きを減らす」設定のときは、ただの文字として最初から見える。
 */
export default function RevealHeadingText({ children }: { children: ReactNode }) {
  return (
    <span className="reveal-line">
      <span>{children}</span>
    </span>
  );
}
