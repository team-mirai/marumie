import Link from "next/link";

interface YearSegmentProps {
  /** 切り替え先の年と、その年のページの URL */
  years: { year: number; href: string }[];
  currentYear: number;
  /**
   * 見た目。mist はミストグラデーションの面に重ねる半透明のもの、
   * outline は白いカードに置く黒い枠と黒い選択のもの
   */
  variant?: "mist" | "outline";
}

const VARIANT_CLASSES = {
  mist: {
    nav: "p-[3px] bg-white/40 backdrop-blur-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_0_0_1px_rgba(255,255,255,0.5)]",
    current: "bg-white text-[#0A1A17] shadow-[0_2px_6px_-2px_rgba(10,60,52,0.35)]",
    other: "text-[#0A1A17]/80 hover:text-[#0A1A17]",
  },
  outline: {
    nav: "p-1 border border-black bg-white",
    current: "bg-black text-white",
    other: "text-black hover:bg-[#F4F8F6]",
  },
} as const;

/** 見出しカードの右下に置く、年の切り替え（2025／2026）。年ごとのページへのリンクで切り替える。 */
export default function YearSegment({ years, currentYear, variant = "mist" }: YearSegmentProps) {
  const classes = VARIANT_CLASSES[variant];
  return (
    <nav aria-label="表示する年" className={`inline-flex rounded-full ${classes.nav}`}>
      {years.map(({ year, href }) => {
        const isCurrent = year === currentYear;
        return (
          <Link
            key={year}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`inline-flex h-[34px] min-w-16 items-center justify-center rounded-full px-4 text-[13px] font-semibold leading-none transition-colors ${
              isCurrent ? classes.current : classes.other
            }`}
          >
            {year}
          </Link>
        );
      })}
    </nav>
  );
}
