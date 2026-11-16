import "server-only";
import type { ReactNode } from "react";

interface GradientMessageCardProps {
  title: string;
  /** 見出しの下に置く本文。 */
  children: ReactNode;
  /** 置く場所ごとの余白など */
  className?: string;
}

/** 見出しと短い本文を載せる、緑グラデーションのカード。 */
export default function GradientMessageCard({
  title,
  children,
  className = "",
}: GradientMessageCardProps) {
  return (
    <div
      className={`flex items-center self-stretch bg-gradient-to-br from-[#64D8C6] to-[#BCECD3] rounded-[22px] p-8 min-[641px]:p-12 ${className}`}
    >
      <div className="flex flex-col justify-center gap-2 min-[641px]:gap-[10.84px]">
        <div className="flex">
          <h2 className="text-xl min-[641px]:text-[27px] font-bold leading-[1.5] tracking-[0.01em] text-gray-800 font-japanese">
            {title}
          </h2>
        </div>
        <p className="text-xs min-[641px]:text-base font-normal leading-[1.667] min-[641px]:leading-[1.75] tracking-[0.01em] text-gray-800 font-japanese max-w-[874px]">
          {children}
        </p>
      </div>
    </div>
  );
}
