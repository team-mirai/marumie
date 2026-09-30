import "server-only";
import type { ReactNode } from "react";

interface GradientMessageCardProps {
  title: string;
  /** 見出しの下に置く本文。 */
  children: ReactNode;
}

/** 見出しと短い本文を載せる、緑グラデーションのカード。 */
export default function GradientMessageCard({ title, children }: GradientMessageCardProps) {
  return (
    <div className="flex items-center self-stretch bg-gradient-to-br from-[#64D8C6] to-[#BCECD3] rounded-[22px] p-8 sm:p-12">
      <div className="flex flex-col justify-center gap-2 sm:gap-[10.84px]">
        <div className="flex">
          <h2 className="text-xl sm:text-[27px] font-bold leading-[1.5] tracking-[0.01em] text-gray-800 font-japanese">
            {title}
          </h2>
        </div>
        <p className="text-xs sm:text-base font-normal leading-[1.667] sm:leading-[1.75] tracking-[0.01em] text-gray-800 font-japanese max-w-[874px]">
          {children}
        </p>
      </div>
    </div>
  );
}
