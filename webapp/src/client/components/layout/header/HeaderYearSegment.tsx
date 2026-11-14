import Link from "next/link";

interface HeaderYearSegmentProps {
  /** 「{名前}の表示する年」の {名前} */
  name: string;
  years: { year: number; href: string; isSelected: boolean }[];
  onNavigate: () => void;
}

/** メガメニューの行の右に置く、年の切り替え（2025｜2026）。表示中でなければどれも選ばれていない。 */
export default function HeaderYearSegment({ name, years, onNavigate }: HeaderYearSegmentProps) {
  return (
    <nav
      aria-label={`${name}の表示する年`}
      className="inline-flex shrink-0 rounded-full border border-black bg-white p-[3px]"
    >
      {years.map(({ year, href, isSelected }) => (
        <Link
          key={year}
          href={href}
          onClick={onNavigate}
          aria-current={isSelected ? "page" : undefined}
          className={`inline-flex h-[26px] min-w-[50px] items-center justify-center rounded-full px-2.5 text-xs font-semibold leading-none transition-colors ${
            isSelected ? "bg-black text-white" : "text-black hover:bg-[#F3F7F6]"
          }`}
        >
          {year}
        </Link>
      ))}
    </nav>
  );
}
