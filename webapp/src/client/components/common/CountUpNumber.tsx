"use client";
import "client-only";
import { useEffect, useRef, useState } from "react";
import { COUNT_UP_DURATION_MS, countUpText, parseCountUpTarget } from "@/client/lib/count-up";
import { useInView } from "@/client/lib/use-in-view";

interface CountUpNumberProps {
  /** 最終的に出す数字（"1537" など）。サーバーレンダリングの HTML にはこの値をそのまま入れる */
  value: string;
  /**
   * value を含む金額全体を表す値（円単位の金額など）。億と万を別々に数えるとき、片方の数字が同じでも
   * 金額が変わったことが分かるように渡す。省略時は value
   */
  amountKey?: string;
  className?: string;
}

/**
 * 見出しカードの金額の数字。画面に入ったときに 0 から最終値までカウントアップする（v9）。
 * - 数えるのは最初に画面に入ったときの 1 回だけ。年や議員を切り替えて値が変わったときは数えずに新しい値を出す
 * - 「動きを減らす」設定のときは数えない
 * - value が空のときは何も描かない。億の下の万が 0 の金額に切り替えて戻したときも、新しく数え直さないよう部品は残しておく
 */
export default function CountUpNumber({ value, amountKey, className }: CountUpNumberProps) {
  const key = amountKey ?? value;
  const { ref, inView } = useInView<HTMLElement>();
  // 数えている途中の表示。value が変わったら使わない（新しい値をそのまま出す）
  const [frame, setFrame] = useState<{ value: string; text: string } | null>(null);
  // 数えはじめた金額。開発時の StrictMode で effect が 2 回走っても、同じ値なら数え直せるようにする
  const startedForRef = useRef<string | null>(null);
  // 数えはじめたあとに金額が変わったら、以後は数えない
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!inView || lockedRef.current) return;
    if (startedForRef.current !== null && startedForRef.current !== key) {
      lockedRef.current = true;
      return;
    }
    startedForRef.current = key;
    const target = parseCountUpTarget(value);
    if (target === null || target === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = (now - start) / COUNT_UP_DURATION_MS;
      if (progress >= 1) {
        setFrame(null);
        return;
      }
      setFrame({ value, text: countUpText(target, progress) });
      raf = requestAnimationFrame(step);
    };
    setFrame({ value, text: countUpText(target, 0) });
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setFrame(null);
    };
  }, [inView, value, key]);

  if (value === "") return null;
  return (
    <b ref={ref} className={className}>
      {frame !== null && frame.value === value ? frame.text : value}
    </b>
  );
}
