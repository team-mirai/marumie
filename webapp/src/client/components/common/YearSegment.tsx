import Link from "next/link";

type YearSegmentProps = (
  | {
      /**
       * 切り替え先の年と、その年のページの URL。年ごとのページへのリンクで切り替える。
       * データの無い年は href を null にし、押せない理由（例: 「2025年分の調研費はありません」）を unavailableReason に入れる
       */
      years: (
        | { year: number; href: string }
        | { year: number; href: null; unavailableReason: string }
      )[];
      currentYear: number;
      onSelect?: never;
    }
  | {
      /** その場で表示を切り替える年（トップページのカードなど）。押した年を onSelect で受け取る */
      years: { year: number }[];
      currentYear: number;
      onSelect: (year: number) => void;
    }
) & {
  /** mist はミストグラデーションの面の上（すりガラス）、plain は白いカードの上（黒い枠線） */
  tone?: "mist" | "plain";
};

const CONTAINER_CLASS = {
  mist: "bg-white/40 backdrop-blur-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_0_0_1px_rgba(255,255,255,0.5)]",
  plain: "bg-white shadow-[inset_0_0_0_1px_#000]",
};

const CURRENT_CLASS = {
  mist: "bg-white text-[#0A1A17] shadow-[0_2px_6px_-2px_rgba(10,60,52,0.35)]",
  plain: "bg-black text-white",
};

const containerClass = (tone: "mist" | "plain") =>
  `inline-flex rounded-full p-[3px] ${CONTAINER_CLASS[tone]}`;

const itemClass = (isCurrent: boolean, tone: "mist" | "plain") =>
  `tap-44 inline-flex h-[34px] min-w-16 items-center justify-center rounded-full px-4 text-[13px] font-bold leading-none transition-colors ${
    isCurrent ? CURRENT_CLASS[tone] : "text-[#0A1A17]/80 hover:text-[#0A1A17]"
  }`;

/** 見出しカードの右下に置く、年の切り替え（2025／2026）。 */
export default function YearSegment(props: YearSegmentProps) {
  const { currentYear, tone = "mist" } = props;

  if (props.onSelect) {
    const { onSelect } = props;
    return (
      <fieldset aria-label="表示する年" className={`m-0 min-w-0 border-0 ${containerClass(tone)}`}>
        {props.years.map(({ year }) => {
          const isCurrent = year === currentYear;
          return (
            <button
              key={year}
              type="button"
              aria-pressed={isCurrent}
              onClick={() => onSelect(year)}
              className={`cursor-pointer ${itemClass(isCurrent, tone)}`}
            >
              {year}
            </button>
          );
        })}
      </fieldset>
    );
  }

  return (
    <nav aria-label="表示する年" className={containerClass(tone)}>
      {props.years.map((option) => {
        const { year, href } = option;
        const isCurrent = year === currentYear;
        if (href === null) {
          // データの無い年は押せない。見た目を薄くし、理由は title と読み上げで伝える
          return (
            <span
              key={year}
              aria-disabled="true"
              title={option.unavailableReason}
              className={`cursor-default opacity-[0.38] ${itemClass(false, tone)}`}
            >
              {year}
              <span className="sr-only">（{option.unavailableReason}）</span>
            </span>
          );
        }
        return (
          <Link
            key={year}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={itemClass(isCurrent, tone)}
          >
            {year}
          </Link>
        );
      })}
    </nav>
  );
}
