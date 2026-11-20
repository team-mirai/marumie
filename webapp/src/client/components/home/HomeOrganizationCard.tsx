"use client";
import "client-only";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useState } from "react";
import AmountSummary from "@/client/components/common/AmountSummary";
import YearSegment from "@/client/components/common/YearSegment";
import HomeCardTitleLink from "@/client/components/home/HomeCardTitleLink";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import type { SankeyData } from "@/types/sankey";

interface HomeOrganizationCardYear {
  year: number;
  political: SankeyData | null;
  friendly: SankeyData | null;
}

interface HomeOrganizationCardProps {
  /** SP の見出しの面の色。政党は緑、政治団体は青みのある緑にする */
  tone: "party" | "group";
  slug: string;
  /** 団体名（例: 「チームみらい」） */
  name: string;
  /** 見出し（例: 「チームみらいの収支」）。省略時は団体名 */
  title?: string;
  /** 見出しの下に、表示中の年の前に添える正式名など（例: 「デジタル民主主義を考える会」） */
  subtitle?: string;
  avatar: ReactNode;
  /** 例: 「2026.10.23 更新」 */
  updatedAt: string;
  years: HomeOrganizationCardYear[];
  /** 最初に表示する年 */
  defaultYear: number;
  /** 金額の文字の大きさ。政治団体のカードを横に並べるときは "compact" */
  amountSize?: "default" | "compact";
  /** 見出しの階層。トップページに直接並べるカードは h2、「議員の政治団体」のようにセクションの中に並べるカードは h3 */
  headingLevel?: "h2" | "h3";
  /** 画面に入るときのフェードインを遅らせる秒数。並べた政治団体のカードに時差をつける */
  revealDelaySeconds?: number;
}

const CHEVRON_PATH = "M9 5l7 7-7 7";

/**
 * トップページの政党・政治団体の収支カード（v9）。年の切り替えでその場の金額と収支の流れを差し替え、
 * 「詳しく」から選んでいる年の政党・政治団体ページへ移る。
 * PC（641px〜）は白いカードの中に見出しの行（ロゴ・見出し・年の切り替え）を置き、見出しの文字のすぐ後ろに › を付ける。
 * SP はミストグラデーションの見出しの面をカードの上端に重ね、左下に年の切り替え、右下に「詳しく見る」を置く。
 */
export default function HomeOrganizationCard({
  tone,
  slug,
  name,
  title = name,
  subtitle,
  avatar,
  updatedAt,
  years,
  defaultYear,
  amountSize = "default",
  headingLevel = "h2",
  revealDelaySeconds = 0,
}: HomeOrganizationCardProps) {
  const Heading = headingLevel;
  const [currentYear, setCurrentYear] = useState(defaultYear);
  const current = years.find((y) => y.year === currentYear) ?? years[0];
  const detailHref = `/o/${slug}/${current.year}`;
  // 取得に失敗したときは 0 円と区別できるよう、金額を出さない
  const summary = current.friendly ? calculateSankeyFinancialSummary(current.friendly) : null;
  const yearLabel = `${current.year}年`;
  // その年の収支がまだ無い（取得はできたが流れが1本も無い）ときは、図の代わりに準備中と出す。
  // 取得に失敗したとき（null）は、図の欄で取得できなかったことを伝える
  const hasNoFlow =
    current.friendly !== null &&
    current.political !== null &&
    current.friendly.links.length === 0 &&
    current.political.links.length === 0;
  const yearOptions = years.map(({ year }) => ({ year }));

  // SP のミストの面の見出し。PC の見出しは HomeCardTitleLink
  const heading = (
    <Heading className="m-0 break-keep text-[18px] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere]">
      <Link href={detailHref} className="text-inherit hover:underline hover:underline-offset-[3px]">
        {title}
      </Link>
    </Heading>
  );
  const sub = (
    <span className="text-[14px] font-bold text-[#238778]">
      {subtitle ? `${subtitle}・` : ""}
      <span className="whitespace-nowrap">{yearLabel}</span>
    </span>
  );

  return (
    <section
      aria-label={title}
      data-reveal
      className="mt-[18px] min-[641px]:mt-0"
      style={{ "--reveal-delay": `${revealDelaySeconds}s` } as CSSProperties}
    >
      <div className="flex flex-col gap-[22px] rounded-[24px] bg-white pb-5 shadow-[0_0_0_1px_#DCE4E1,0_30px_50px_-34px_rgba(10,60,52,0.35)] min-[641px]:gap-6 min-[641px]:rounded-[32px] min-[641px]:p-[clamp(24px,3.6vw,48px)] min-[641px]:shadow-[0_2px_6px_rgba(11,15,14,0.06),0_8px_24px_rgba(11,15,14,0.06)]">
        {/* SP：ミストグラデーションの見出しの面（カードの上端に重ねる） */}
        <div
          className={`mist-surface ${tone === "group" ? "mist-surface-group" : ""} -mt-[18px] mb-1 grid aspect-[1.9825] w-[calc((100%-40px)*1.071*1.04)] grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr_auto] items-center gap-x-[11px] self-center rounded-[20px] pb-[14px] pl-4 pr-[14px] pt-4 min-[641px]:hidden`}
        >
          <span className="col-start-1 row-start-1 flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)]">
            {avatar}
          </span>
          <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
            {heading}
            {sub}
          </span>
          <div className="col-span-full row-start-3 self-end justify-self-start">
            <YearSegment years={yearOptions} currentYear={current.year} onSelect={setCurrentYear} />
          </div>
          <Link
            href={detailHref}
            aria-label={`${title}を詳しく見る`}
            className="more-link z-[1] col-span-full row-start-3 mb-[-4px] mr-[14px] self-end justify-self-end"
          >
            詳しく見る
          </Link>
        </div>

        {/* PC：白いカードの中の見出しの行 */}
        <div className="hidden items-center gap-4 min-[641px]:flex">
          <span className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            {avatar}
          </span>
          <HomeCardTitleLink
            href={detailHref}
            title={title}
            headingLevel={headingLevel}
            sub={sub}
          />
          <div className="ml-auto flex-shrink-0">
            <YearSegment
              years={yearOptions}
              currentYear={current.year}
              onSelect={setCurrentYear}
              tone="plain"
            />
          </div>
        </div>

        <div className="@container mx-4 flex flex-col gap-[22px] min-[641px]:mx-0 min-[641px]:gap-6">
          <AmountSummary
            size={amountSize}
            home
            items={[
              { label: "収入総額", color: "#2AA693", amount: summary?.income ?? null },
              { label: "支出総額", color: "#DC2626", amount: summary?.expense ?? null },
              { label: "現金残高", color: "#6B7280", amount: summary?.balance ?? null },
            ]}
          />
          {hasNoFlow ? (
            <p className="m-0 text-[13px] font-bold text-[#5B6470]">
              {yearLabel}の収支の流れの図は準備中です
            </p>
          ) : (
            // 年を切り替えたらタブの選択を初期に戻す
            <div className="min-[641px]:-mt-2">
              <CashFlowSection
                key={current.year}
                political={current.political}
                friendly={current.friendly}
                // 「指を広げて拡大」はトップの 1 枚目（チームみらいの収支）の図だけに出す
                pinchHint={tone === "party"}
              />
            </div>
          )}
          {/* 更新日はカードの右下。PC（1101px〜）は「詳しく」ボタンと同じ行の右端に重ねる。
              政治団体のカードを横に並べて内側が狭いときはボタンと重なるので、ボタンの上の行に置く */}
          {updatedAt && (
            <div className="-mt-1 flex justify-end min-[641px]:mt-0 min-[1101px]:@min-[720px]:pointer-events-none min-[1101px]:@min-[720px]:-mb-[76px] min-[1101px]:@min-[720px]:h-[52px] min-[1101px]:@min-[720px]:items-center">
              <span className="whitespace-nowrap text-[12px] font-medium leading-none text-[#5B6470] tabular-nums">
                {updatedAt}
              </span>
            </div>
          )}
          <Link
            href={detailHref}
            className="pill-arrow inline-flex h-12 items-center justify-center gap-1 self-stretch whitespace-nowrap rounded-full bg-[#0B0F0E] px-3.5 text-[clamp(12px,3.8vw,15px)] font-extrabold text-white transition-colors hover:bg-[#0F8472] min-[641px]:h-[52px] min-[641px]:min-w-[min(100%,360px)] min-[641px]:gap-1.5 min-[641px]:self-center min-[641px]:px-7 min-[641px]:text-[15px]"
          >
            {name}の収支を詳しく
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="flex-shrink-0"
            >
              <path d={CHEVRON_PATH} />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
