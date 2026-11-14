import Link from "next/link";

interface YearSegmentProps {
  /** 切り替え先の年と、その年のページの URL */
  years: { year: number; href: string }[];
  currentYear: number;
  /** mist はミストグラデーションの面の上（すりガラス）、plain は白いカードの上（黒い枠線） */
  tone?: "mist" | "plain";
}

const CONTAINER_CLASS = {
  mist: "bg-white/40 backdrop-blur-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_0_0_1px_rgba(255,255,255,0.5)]",
  plain: "bg-white shadow-[inset_0_0_0_1px_#000]",
};

const CURRENT_CLASS = {
  mist: "bg-white text-[#0A1A17] shadow-[0_2px_6px_-2px_rgba(10,60,52,0.35)]",
  plain: "bg-black text-white",
};

/** 見出しカードの右下に置く、年の切り替え（2025／2026）。年ごとのページへのリンクで切り替える。 */
export default function YearSegment({ years, currentYear, tone = "mist" }: YearSegmentProps) {
  return (
    <nav
      aria-label="表示する年"
      className={`inline-flex rounded-full p-[3px] ${CONTAINER_CLASS[tone]}`}
    >
      {years.map(({ year, href }) => {
        const isCurrent = year === currentYear;
        return (
          <Link
            key={year}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`inline-flex h-[34px] min-w-16 items-center justify-center rounded-full px-4 text-[13px] font-semibold leading-none transition-colors ${
              isCurrent ? CURRENT_CLASS[tone] : "text-[#0A1A17]/80 hover:text-[#0A1A17]"
            }`}
          >
            {year}
          </Link>
        );
      })}
    </nav>
  );
}
