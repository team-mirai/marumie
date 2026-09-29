"use client";
import "client-only";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/** 吹き出しと画面端・ピルとの間隔(px) */
const GAP = 8;

interface Position {
  top: number;
  left: number;
  arrowLeft: number;
}

/**
 * 説明を持つ科目（交通費）のピル。表示名の右に情報アイコンを出し、アイコンへの PC のホバー・
 * SP のタップ・キーボードのフォーカスで、ピルの上に説明の吹き出しを出す。
 *
 * 明細の行や表の枠で切れないよう、吹き出しは body 直下に fixed で描き、画面の左右端に収める。
 * スクリーンリーダー向けには説明文を常に視覚的に隠して置き、アイコンのボタンから参照させる。
 */
export default function ResearchFundCategoryInfoPill({
  label,
  description,
  className,
  style,
  children,
}: {
  label: string;
  description: string;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const descriptionId = useId();

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const rect = anchor.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const maxLeft = Math.max(GAP, window.innerWidth - tooltip.offsetWidth - GAP);
    const left = Math.min(Math.max(center - tooltip.offsetWidth / 2, GAP), maxLeft);
    setPosition({
      top: rect.top - tooltip.offsetHeight - GAP,
      left,
      arrowLeft: center - left,
    });
  }, []);

  // 開いた直後に吹き出しの大きさを測って位置を決める（決まるまでは visibility: hidden）。
  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    // SP のタップで開いた吹き出しは、アイコンの外をタップしたら閉じる。
    const closeOnOutside = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <span ref={anchorRef} className={className} style={style}>
      {children}
      <button
        type="button"
        aria-label={`${label}の説明`}
        aria-describedby={descriptionId}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="-my-1 -mr-1.5 ml-0.5 inline-flex cursor-help items-center p-1 text-[#9CA3AF]"
      >
        <InfoIcon />
      </button>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
      {open &&
        createPortal(
          <span
            ref={tooltipRef}
            aria-hidden="true"
            className="pointer-events-none fixed z-[1000] max-w-[calc(100vw-16px)] rounded-md bg-black px-2.5 py-1.5 text-xs font-medium leading-5 text-white"
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {description}
            <span
              className="absolute top-full -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-black"
              style={{ left: position?.arrowLeft ?? 0 }}
            />
          </span>,
          document.body,
        )}
    </span>
  );
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.75" r="0.9" fill="currentColor" />
    </svg>
  );
}
