"use client";
import "client-only";

import { type ReactNode, type TouchEvent, useRef, useState } from "react";

/** 拡大の上限（元の幅の何倍まで広げるか） */
const MAX_SCALE = 3.2;

interface PinchZoomProps {
  children: ReactNode;
  className?: string;
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
 */
export default function PinchZoom({ children, className = "" }: PinchZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const [scale, setScale] = useState(1);
  const [baseSize, setBaseSize] = useState<{ width: number; height: number } | null>(null);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (event.touches.length !== 2 || !container || !content) return;
    // 拡大前の大きさを覚えておき、拡大中もその大きさで描く
    const size = baseSize ?? { width: content.offsetWidth, height: content.offsetHeight };
    if (!baseSize) setBaseSize(size);
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
    setScale(next);
    // 指の間の位置が動かないようにスクロールを合わせる
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

  const zoomed = baseSize !== null && scale > 1;

  return (
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
  );
}
