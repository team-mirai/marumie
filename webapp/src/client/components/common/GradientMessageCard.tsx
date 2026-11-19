import "server-only";
import type { ReactNode } from "react";

interface GradientMessageCardProps {
  title: string;
  /** 見出しの末尾に添える絵文字。読み上げない */
  emoji?: string;
  /** 見出しの下に置く本文。 */
  children: ReactNode;
  /** 置く場所ごとの余白など */
  className?: string;
  /** 本文の段落に足すクラス（折り返し方など） */
  bodyClassName?: string;
  /** "home" はトップページ用。見出しの太さがトップだけ 700 になる */
  layout?: "default" | "home";
}

/**
 * 一言コメントの帯（v9 の .mt-band）。見出しと短い本文を載せる、緑グラデーションのカード。
 * 文字は見出し PC 26px・SP 20px、本文 PC 18px・SP 14px。
 * 見出しの太さは v9 の描画に合わせ、トップは 700、ほかのページは 900（v9 の h2 への 900 !important が効くため）。
 */
export default function GradientMessageCard({
  title,
  emoji,
  children,
  className = "",
  bodyClassName = "",
  layout = "default",
}: GradientMessageCardProps) {
  const titleWeight = layout === "home" ? "font-bold" : "font-black";
  return (
    <div
      data-reveal
      className={`flex items-start self-stretch rounded-[32px] bg-[linear-gradient(120deg,#A3E7DC_0%,#CFF1E0_100%)] px-[clamp(24px,3.6vw,48px)] py-[clamp(28px,3.6vw,44px)] shadow-[0_8px_24px_rgba(15,132,114,0.10)] ${className}`}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        <h2
          className={`m-0 text-[20px] min-[641px]:text-[26px] ${titleWeight} leading-[1.5] tracking-[0.01em] text-gray-800 font-japanese`}
        >
          {title}
          {emoji && <span aria-hidden="true">{emoji}</span>}
        </h2>
        <p
          className={`m-0 max-w-[874px] text-[14px] min-[641px]:text-[18px] font-normal leading-[1.75] tracking-[0.01em] text-gray-800 font-japanese ${bodyClassName}`}
        >
          {children}
        </p>
      </div>
    </div>
  );
}
