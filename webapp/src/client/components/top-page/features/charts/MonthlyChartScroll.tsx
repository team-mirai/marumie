"use client";
import "client-only";

import type { ReactNode } from "react";
import { useInView } from "@/client/lib/use-in-view";

/**
 * 月ごとの推移のグラフを包む横スクロールの領域。SP ではグラフを 640px 幅のまま横にスクロールさせ、
 * 右端をぼかし、グラフが画面に入ったら中央に「左右にスクロール」を数秒だけ出す（スタイルは globals.css）。
 * キーボードでもフォーカスしてスクロールできるよう tabIndex を付け、読み上げで横にスクロールできることを伝える。
 */
export default function MonthlyChartScroll({ children }: { children: ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="monthly-hscroll-frame relative"
      data-in-view={inView ? "true" : undefined}
    >
      {/* 名前の付いた section は region として読み上げられる */}
      <section
        className="monthly-hscroll overflow-x-auto"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: 横スクロールの領域をキーボードでもスクロールできるようにする
        tabIndex={0}
        aria-label="月ごとの推移のグラフ（横にスクロールできます）"
      >
        <div className="min-w-[640px]">{children}</div>
      </section>
      <p className="monthly-hscroll-hint" aria-hidden="true">
        <span className="hand" />
        左右にスクロール
      </p>
    </div>
  );
}
