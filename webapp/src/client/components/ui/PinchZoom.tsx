"use client";
import "client-only";

import { type ReactNode, type TouchEvent, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useInView } from "@/client/lib/use-in-view";

/** 拡大の上限（元の幅の何倍まで広げるか） */
const MAX_SCALE = 3.2;
/** 「拡大」ボタンで広げる倍率 */
const BUTTON_SCALE = 2.2;

interface PinchZoomProps {
  children: ReactNode;
  className?: string;
  /** SP で図の上に「指を広げて拡大」の案内を数秒だけ重ねるか。トップでは 1 枚目の図にだけ出す */
  hint?: boolean;
}

interface PinchState {
  distance: number;
  scale: number;
  /** 2本の指の中点（コンテナ内の座標）と、その位置のスクロール前の中身の座標 */
  midX: number;
  contentX: number;
}

function touchDistance(touches: TouchEvent["touches"]): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * 中身を全体表示にしたまま、2本指のピンチで拡大できるようにする（SP の収支の流れ用）。
 * 拡大中は横にも縦にもスクロールできる。中身は元の幅で描いたものを CSS の拡大で大きくするので、
 * 文字や線もいっしょに大きくなる。元の大きさ近くまで縮めると全体表示に戻す。
 * ピンチできない人のために、SP では右上に「拡大」ボタンを置き、拡大中は「全体を表示」に入れ替える（スタイルの一部は globals.css）。
 */
export default function PinchZoom({ children, className = "", hint = true }: PinchZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const fitButtonRef = useRef<HTMLButtonElement>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const [scale, setScale] = useState(1);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number } | null>(null);
  const { ref: frameRef, inView } = useInView<HTMLDivElement>();

  // 拡大前の大きさを覚えておき、拡大中もその大きさで描く
  const measureBaseSize = () => {
    const content = contentRef.current;
    if (baseSize || !content) return baseSize;
    const size = { width: content.offsetWidth, height: content.offsetHeight };
    setBaseSize(size);
    return size;
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (event.touches.length !== 2 || !container || !measureBaseSize()) return;
    const rect = container.getBoundingClientRect();
    const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
    pinchRef.current = {
      distance: touchDistance(event.touches),
      scale,
      midX,
      contentX: (midX + container.scrollLeft) / scale,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const pinch = pinchRef.current;
    const container = containerRef.current;
    if (!pinch || event.touches.length !== 2 || !container) return;
    const next = Math.min(
      MAX_SCALE,
      Math.max(1, (pinch.scale * touchDistance(event.touches)) / pinch.distance),
    );
    // 拡大後の幅を先に DOM に反映してから、指の間の位置が動かないようにスクロールを合わせる
    flushSync(() => setScale(next));
    container.scrollLeft = pinch.contentX * next - pinch.midX;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!pinchRef.current || event.touches.length >= 2) return;
    pinchRef.current = null;
    if (scale <= 1.05) {
      setScale(1);
      setBaseSize(null);
    }
  };

  // ボタンは押すと消えて入れ替わるので、フォーカスも入れ替わった側のボタンへ移す
  const handleZoom = () => {
    if (!measureBaseSize()) return;
    flushSync(() => setScale(BUTTON_SCALE));
    if (containerRef.current) containerRef.current.scrollLeft = 0;
    fitButtonRef.current?.focus();
  };

  const handleFit = () => {
    flushSync(() => {
      setScale(1);
      setBaseSize(null);
    });
    if (containerRef.current) containerRef.current.scrollLeft = 0;
    zoomButtonRef.current?.focus();
  };

  const zoomed = baseSize !== null && scale > 1;

  return (
    <div ref={frameRef} className="relative" data-in-view={inView ? "true" : undefined}>
      <div
        ref={containerRef}
        className={`overflow-auto [touch-action:pan-x_pan-y] ${className}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          style={
            zoomed ? { width: baseSize.width * scale, height: baseSize.height * scale } : undefined
          }
        >
          <div
            ref={contentRef}
            style={
              zoomed
                ? {
                    width: baseSize.width,
                    transform: `scale(${scale})`,
                    transformOrigin: "0 0",
                  }
                : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
      {hint && !zoomed && (
        <p className="pinch-zoom-hint" aria-hidden="true">
          <span className="hand" />
          指を広げて拡大
        </p>
      )}
      {zoomed ? (
        <button
          ref={fitButtonRef}
          type="button"
          onClick={handleFit}
          className="absolute right-0 top-0 z-[4] hidden h-8 cursor-pointer items-center rounded-full border border-[#0B0F0E] bg-white/[.92] px-3.5 text-[13px] font-bold leading-none text-[#0B0F0E] shadow-[0_2px_8px_rgba(11,15,14,0.12)] before:absolute before:-inset-x-0.5 before:-inset-y-1.5 before:content-[''] max-[640px]:inline-flex"
        >
          全体を表示
        </button>
      ) : (
        // 見出し「支給／支出」の行の右端に収まる 32px。押せる範囲は周りに広げて 44px にする
        <button
          ref={zoomButtonRef}
          type="button"
          onClick={handleZoom}
          aria-label="図を拡大する"
          title="図を拡大する"
          className="absolute -top-2 right-0 z-[4] hidden size-8 cursor-pointer items-center justify-center rounded-full bg-white/95 p-0 text-[#0B0F0E] shadow-[0_2px_10px_rgba(11,15,14,0.16)] before:absolute before:-inset-1.5 before:content-[''] max-[640px]:inline-flex"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L20 20M10.5 7.8v5.4M7.8 10.5h5.4" />
          </svg>
        </button>
      )}
    </div>
  );
}
