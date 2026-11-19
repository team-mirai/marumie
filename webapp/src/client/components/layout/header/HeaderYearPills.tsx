import Link from "next/link";

interface HeaderYearPillsProps {
  /** 「{名前}の表示する年」の {名前} */
  name: string;
  years: { year: number; href: string; isSelected: boolean }[];
  onNavigate: () => void;
}

/** メガメニューの行の右に置く年のピル（2025年／2026年）。表示中の年は黒。表示中でなければどれも白。 */
export default function HeaderYearPills({ name, years, onNavigate }: HeaderYearPillsProps) {
  return (
    <nav aria-label={`${name}の表示する年`} className="inline-flex shrink-0 gap-1.5">
      {years.map(({ year, href, isSelected }) => (
        <Link
          key={year}
          href={href}
          onClick={onNavigate}
          aria-current={isSelected ? "page" : undefined}
          className={`inline-flex h-8 items-center whitespace-nowrap rounded-full border border-black px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#238778] ${
            isSelected ? "bg-black text-white" : "bg-white text-[#111827] hover:bg-[#F3F7F6]"
          }`}
        >
          {year}年
        </Link>
      ))}
    </nav>
  );
}
