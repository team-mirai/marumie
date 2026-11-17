import Link from "next/link";
import type { ReactNode } from "react";

interface MistHeadingCardProps {
  /** セクションの読み上げ名（例: 「政党情報」） */
  ariaLabel: string;
  /** 左上の丸の中身（代表者の写真など） */
  avatar: ReactNode;
  /** カードの見出し（例: 「チームみらいの収支」） */
  title: string;
  /** 見出しの下に添える年など（例: 「2026年」） */
  subtitle?: string;
  /** 例: 「2026.10.23 更新」。カードの右下に出す */
  updatedAt: string;
  /** 年の切り替え。SP はミストの面の左下（すりガラス）、PC は見出しの行の右端（黒）に置く */
  yearSwitch: { sp: ReactNode; pc: ReactNode };
  /** 渡すと、見出しと右上の矢印がこの URL へのリンクになる（トップページのカード） */
  href?: string;
  /** ページの最初の見出しになるカードは h1、トップページのように並べるカードは h2、セクションの中のカードは h3 */
  headingLevel?: "h1" | "h2" | "h3";
  /** 面の色。政党は緑、政治団体は青みのある緑 */
  tone?: "party" | "group";
  /** カードの面の下に続く本文（金額・収支の流れなど） */
  children: ReactNode;
}

const TONE_CLASSES = {
  party: "",
  group: "mist-surface-group",
} as const;

const CHEVRON_PATH = "M9 5l7 7-7 7";

/**
 * 見出しカード（v9 の政党ページ）。
 * PC（641px〜）は白いカードの中に見出しの行（ロゴ・見出し・年の切り替え）を置き、本文の右下に更新日を出す。
 * SP はミストグラデーションの面（ロゴ・見出し・左下に年の切り替え）をカードの上端に重ね、
 * 一般的なカードの縦横比にそろえる。更新日は面から外してカードの右下に出す。
 */
export default function MistHeadingCard({
  ariaLabel,
  avatar,
  title,
  subtitle,
  updatedAt,
  yearSwitch,
  href,
  headingLevel = "h1",
  tone = "party",
  children,
}: MistHeadingCardProps) {
  const Heading = headingLevel;

  const heading = (
    <Heading className="m-0 break-keep text-[18px] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere] min-[641px]:text-[clamp(22px,2.6vw,32px)]">
      {href ? (
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      ) : (
        title
      )}
    </Heading>
  );
  const sub = subtitle && (
    <span className="text-[14px] font-bold text-[#0A1A17]/80">{subtitle}</span>
  );

  return (
    <section aria-label={ariaLabel} data-reveal className="mt-[18px] min-[641px]:mt-0">
      <div className="flex flex-col gap-[22px] rounded-[24px] bg-white pb-5 shadow-[0_0_0_1px_#DCE4E1,0_30px_50px_-34px_rgba(10,60,52,0.35)] min-[641px]:gap-6 min-[641px]:rounded-[32px] min-[641px]:p-[clamp(24px,3.6vw,48px)] min-[641px]:shadow-[0_1px_2px_rgba(11,15,14,0.04)]">
        {/* SP：ミストグラデーションの見出しの面（カードの上端に重ねる） */}
        <div
          className={`mist-surface ${TONE_CLASSES[tone]} -mt-[18px] mb-1 grid aspect-[1.9825] w-[calc((100%-40px)*1.029)] ${
            href ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]"
          } grid-rows-[auto_1fr_auto] items-center gap-x-[11px] self-center rounded-[20px] pb-[14px] pl-4 pr-[14px] pt-4 min-[641px]:hidden`}
        >
          <span className="col-start-1 row-start-1 flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)]">
            {avatar}
          </span>
          <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
            {heading}
            {sub}
          </span>
          {href && (
            <Link
              href={href}
              aria-label={`${title}を詳しく見る`}
              className="relative col-start-3 row-start-1 flex h-[42px] w-[42px] items-center after:absolute after:-inset-1 after:content-[''] justify-center rounded-full bg-white/50 text-[#0A1A17] backdrop-blur-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_2px_6px_-2px_rgba(10,60,52,0.25)] transition-[background,transform] hover:translate-x-0.5 hover:bg-white/80"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={CHEVRON_PATH} />
              </svg>
            </Link>
          )}
          <div className="col-span-full row-start-3 self-end justify-self-start">
            {yearSwitch.sp}
          </div>
        </div>

        {/* PC：白いカードの中の見出しの行（右端に黒い年の切り替え） */}
        <div className="hidden items-center gap-4 min-[641px]:flex">
          <span className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            {avatar}
          </span>
          <span className="flex min-w-0 flex-[0_1_auto] flex-col gap-1">
            {heading}
            {sub}
          </span>
          {href && (
            <Link
              href={href}
              aria-label={`${title}を詳しく見る`}
              className="relative -ml-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#0B0F0E] transition-[color,transform] after:absolute after:-inset-3 after:content-[''] hover:translate-x-[3px] hover:text-[#0F8472]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={CHEVRON_PATH} />
              </svg>
            </Link>
          )}
          <div className="ml-auto flex-shrink-0">{yearSwitch.pc}</div>
        </div>

        <div className="mx-4 flex flex-col gap-[22px] min-[641px]:mx-0 min-[641px]:gap-6">
          {children}
          {updatedAt && (
            <div className="-mt-1 flex justify-end">
              <span className="whitespace-nowrap text-[12px] font-medium leading-none text-[#5B6470] tabular-nums">
                {updatedAt}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
