import "server-only";
import type { ReactNode } from "react";

interface GradientMessageCardProps {
  title: string;
  /** 見出しの末尾に添える絵文字。読み上げない */
  emoji?: string;
  /** 見出しの下に置く本文。 */
  children: ReactNode;
}

/**
 * 一言コメントの帯（v9 の .mt-band）。見出しと短い本文を載せる、緑グラデーションのカード。
 * 文字は見出し PC 26px・SP 20px、本文 PC 18px・SP 14px。
 */
export default function GradientMessageCard({ title, emoji, children }: GradientMessageCardProps) {
  return (
    <div className="flex items-start self-stretch rounded-[32px] bg-[linear-gradient(120deg,#A3E7DC_0%,#CFF1E0_100%)] px-[clamp(24px,3.6vw,48px)] py-[clamp(28px,3.6vw,44px)] shadow-[0_8px_24px_rgba(15,132,114,0.10)]">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        <h2 className="m-0 text-[20px] min-[641px]:text-[26px] font-bold leading-[1.5] tracking-[0.01em] text-gray-800 font-japanese">
          {title}
          {emoji && <span aria-hidden="true">{emoji}</span>}
        </h2>
        <p className="m-0 max-w-[874px] text-[14px] min-[641px]:text-[18px] font-normal leading-[1.75] tracking-[0.01em] text-gray-800 font-japanese">
          {children}
        </p>
      </div>
    </div>
  );
}
