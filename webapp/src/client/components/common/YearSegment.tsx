"use client";

import Link from "next/link";
import { type MouseEvent, useLayoutEffect, useRef, useState } from "react";

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

/** 選んだ年を示す丸。v9 の `.mt-seg .pill` と同じく、年の位置へ横に滑る */
const PILL_CLASS = {
  mist: "bg-white shadow-[0_2px_6px_-2px_rgba(10,60,52,0.35)]",
  plain: "bg-black",
};

const CURRENT_TEXT_CLASS = {
  mist: "text-[#0A1A17]",
  plain: "text-white",
};

/** v9 の `--ease` と丸の滑る時間 */
const SLIDE_EASING = "cubic-bezier(.2,.7,.1,1)";
const SLIDE_DURATION_MS = 500;

// 年はどれも 4 桁なので、列の幅をそろえて丸を「列の幅 × 位置」だけ動かす
const containerClass = (tone: "mist" | "plain") =>
  `relative inline-grid auto-cols-fr grid-flow-col rounded-full p-[3px] ${CONTAINER_CLASS[tone]}`;

const itemClass = (isCurrent: boolean, tone: "mist" | "plain") =>
  `tap-44 relative inline-flex h-[34px] min-w-16 items-center justify-center rounded-full px-4 text-[13px] font-bold leading-none transition-colors duration-[350ms] ${
    isCurrent ? CURRENT_TEXT_CLASS[tone] : "text-[#0A1A17]/80 hover:text-[#0A1A17]"
  }`;

const pillTransform = (index: number) => `translateX(${index * 100}%)`;

/**
 * 年ごとのページへのリンクで切り替えたときの、滑り始めの記録。
 * 押した時点で元のページの丸を滑らせ始め、遷移先のページで新しく描かれた丸は、この記録から経過時間ぶん進んだところの続きを再生する
 */
let pendingSlide: {
  yearsKey: string;
  fromIndex: number;
  toYear: number;
  startedAt: number;
} | null = null;

const yearsKeyOf = (years: { year: number }[]) => years.map(({ year }) => year).join(",");

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** 新しいクリックでの遷移かどうか（別タブで開く操作などでは丸を動かさない） */
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** 見出しカードの右下に置く、年の切り替え（2025／2026）。 */
export default function YearSegment(props: YearSegmentProps) {
  const { currentYear, years, tone = "mist" } = props;
  const pillRef = useRef<HTMLSpanElement>(null);
  // リンクを押してから遷移先のページが出るまで、押した年に丸を寄せておく
  const [pending, setPending] = useState<{ from: number; to: number } | null>(null);
  const shownYear = pending?.from === currentYear ? pending.to : currentYear;
  const yearsKey = yearsKeyOf(years);
  const currentIndex = years.findIndex(({ year }) => year === shownYear);

  // 遷移先のページで描かれた丸は、元のページで滑り始めた動きの続きから再生する
  useLayoutEffect(() => {
    const slide = pendingSlide;
    const pill = pillRef.current;
    if (!slide || !pill || typeof pill.animate !== "function") return;
    if (slide.yearsKey !== yearsKey || slide.toYear !== currentYear) return;
    const elapsed = performance.now() - slide.startedAt;
    if (elapsed >= SLIDE_DURATION_MS || prefersReducedMotion()) return;
    const animation = pill.animate(
      [{ transform: pillTransform(slide.fromIndex) }, { transform: pillTransform(currentIndex) }],
      { duration: SLIDE_DURATION_MS, easing: SLIDE_EASING },
    );
    animation.currentTime = elapsed;
  }, []); // マウント時に一度だけ確かめる

  const pill =
    currentIndex >= 0 ? (
      <span
        ref={pillRef}
        aria-hidden="true"
        className={`absolute bottom-[3px] left-[3px] top-[3px] rounded-full transition-transform duration-500 ease-[cubic-bezier(.2,.7,.1,1)] motion-reduce:transition-none ${PILL_CLASS[tone]}`}
        style={{
          width: `calc((100% - 6px) / ${years.length})`,
          transform: pillTransform(currentIndex),
        }}
      />
    ) : null;

  if (props.onSelect) {
    const { onSelect } = props;
    return (
      <fieldset aria-label="表示する年" className={`m-0 min-w-0 border-0 ${containerClass(tone)}`}>
        {pill}
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

  const startSlide = (event: MouseEvent, year: number) => {
    if (year === shownYear || !isPlainClick(event)) return;
    const fromIndex = years.findIndex((option) => option.year === shownYear);
    pendingSlide = { yearsKey, fromIndex, toYear: year, startedAt: performance.now() };
    setPending({ from: currentYear, to: year });
  };

  return (
    <nav aria-label="表示する年" className={containerClass(tone)}>
      {pill}
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
            onClick={(event) => startSlide(event, year)}
            className={itemClass(year === shownYear, tone)}
          >
            {year}
          </Link>
        );
      })}
    </nav>
  );
}
