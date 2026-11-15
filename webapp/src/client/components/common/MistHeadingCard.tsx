import Link from "next/link";
import type { ReactNode } from "react";

interface MistHeadingCardProps {
  /** セクションの読み上げ名（例: 「政党情報」） */
  ariaLabel: string;
  /** 左上の丸の中身（政党のロゴ、政治団体の代表者の写真など） */
  avatar: ReactNode;
  /** カードの見出し（例: 「チームみらいの収支」） */
  title: string;
  /** 見出しの下に添える区分と年・正式名など（例: 「政党・2026年」） */
  subtitle?: string;
  /** 例: 「2026.10.23更新」 */
  updatedAt: string;
  /** 右下の年の切り替え */
  yearSwitch: ReactNode;
  /** 渡すと、見出しと右上の矢印がこの URL へのリンクになる（トップページのカード） */
  href?: string;
  /** ページの最初の見出しになるカードは h1、トップページのように並べるカードは h2 */
  headingLevel?: "h1" | "h2";
  /** 面の色。政党は緑、政治団体は青みのある緑 */
  tone?: "party" | "group";
  /** カードの面の下に続く本文（金額・収支の流れなど） */
  children: ReactNode;
}

/**
 * 見出しカード。ミストグラデーションの面（ロゴ・見出し・更新日・年の切り替え）の下に本文を続ける。
 * SP ではグラデーションの面をカードの上端に重ね、一般的なカードの縦横比にそろえる。
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

  return (
    <section aria-label={ariaLabel} className="mt-[18px] md:mt-0">
      <div className="flex flex-col gap-[22px] rounded-[24px] bg-white pb-5 shadow-[0_0_0_1px_#DCE4E1,0_30px_50px_-34px_rgba(10,60,52,0.35)] md:rounded-[32px] md:p-2 md:pb-6">
        <div
          className={`${tone === "group" ? "mist-surface mist-surface-group" : "mist-surface"} -mt-[18px] mb-1 grid aspect-[1.9825] w-[calc((100%-40px)*1.029)] ${
            href ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]"
          } grid-rows-[auto_1fr_auto] items-center gap-x-[11px] self-center rounded-[20px] pb-[14px] pl-4 pr-[14px] pt-4 md:m-0 md:aspect-auto md:min-h-[134px] md:w-auto md:gap-x-[14px] md:self-stretch md:rounded-[24px] md:pb-[18px] md:pl-[22px] md:pr-[18px] md:pt-5`}
        >
          <span className="col-start-1 row-start-1 flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)] md:h-[72px] md:w-[72px]">
            {avatar}
          </span>
          <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
            <Heading className="m-0 break-keep text-[18px] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere] md:text-[clamp(22px,2.6vw,32px)]">
              {href ? (
                <Link href={href} className="hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </Heading>
            {subtitle && (
              <span className="text-[14px] font-semibold text-[#238778]">{subtitle}</span>
            )}
          </span>
          {href && (
            <Link
              href={href}
              aria-label={`${title}を詳しく見る`}
              className="col-start-3 row-start-1 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/50 text-[#0A1A17] backdrop-blur-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_2px_6px_-2px_rgba(10,60,52,0.25)] transition-[background,transform] hover:translate-x-0.5 hover:bg-white/80"
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
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          {updatedAt && (
            <span className="col-span-full row-start-3 self-end justify-self-start text-[12px] font-semibold leading-none tracking-[0.02em] text-[#0A1A17]/80">
              {updatedAt}
            </span>
          )}
          <div className="col-span-full row-start-3 self-end justify-self-end">{yearSwitch}</div>
        </div>
        <div className="mx-4 flex flex-col gap-[22px]">{children}</div>
      </div>
    </section>
  );
}
