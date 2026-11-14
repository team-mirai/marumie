import Link from "next/link";
import YearSegment from "@/client/components/common/YearSegment";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import PoliticianSnsLinks from "@/client/components/research-fund/PoliticianSnsLinks";
import type { PoliticianNav } from "@/client/lib/politician-nav";
import type { ResearchFundPoliticianProfileView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

/** 前後の切り替え・インジケーターのリンク先 */
interface PoliticianNavLink {
  slug: string;
  name: string;
  href: string;
}

interface Props {
  politician: ResearchFundPoliticianProfileView;
  /** 顔写真の URL。未登録なら null */
  photoUrl: string | null;
  /** 年の切り替え。年度が 1 つだけなら切り替えを出さない */
  years: { year: number; href: string }[];
  currentYear: number;
  /** 例: 「2026.10.23更新」 */
  updatedAt: string;
  /** 例: 「2026年2月〜8月支給分」。公開月が無ければ null */
  periodLabel: string | null;
  /** 前後の議員への切り替え。公開中の議員が 1 人以下なら null（出さない） */
  nav: PoliticianNav<PoliticianNavLink> | null;
}

function Chevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

const NAV_BUTTON_CLASS =
  "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 bg-white/60 text-[#0B0F0E] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_-12px_rgba(10,60,52,0.5),0_2px_6px_rgba(10,60,52,0.1)] backdrop-blur-[14px] transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] active:scale-[0.86] md:h-10 md:w-10 md:border-0 md:bg-white md:shadow-[0_2px_6px_rgba(11,15,14,0.10),0_8px_20px_rgba(11,15,14,0.10)] md:backdrop-blur-none md:hover:bg-[#E2F6F3] md:hover:text-[#0F8472]";

/**
 * 議員ページ冒頭の議員カード。
 * PC は白いカード（顔写真・ふりがな・名前・肩書き・期間と更新日・プロフィールと SNS・年の切り替え）、
 * SP はミストグラデーションのカード（顔写真・名前・更新日・年）にする。SP は v8 のとおり肩書きと SNS を出さない。
 * 左右のボタンで前後の議員の調研費ページへ移り、SP はカードの下に何人目かのインジケーターを出す。
 */
export default function PoliticianHeadingCard({
  politician,
  photoUrl,
  years,
  currentYear,
  updatedAt,
  periodLabel,
  nav,
}: Props) {
  const photoAlt = `${politician.name}の写真`;
  const period = periodLabel ?? `${currentYear}年`;
  const hasYearSwitch = years.length > 1;
  const currentIndex = nav?.members.findIndex((member) => member.current) ?? -1;

  return (
    <section aria-label="議員情報">
      <div className="relative">
        {/* PC */}
        <div className="hidden items-center gap-5 rounded-[32px] bg-white px-8 py-7 md:flex">
          <PoliticianAvatar photoUrl={photoUrl} alt={photoAlt} className="h-[88px] w-[88px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-col">
              {politician.nameKana && (
                <span className="text-[12px] font-semibold leading-[1.4] tracking-[0.04em] text-[#6B7280]">
                  {politician.nameKana}
                </span>
              )}
              <span className="text-[30px] font-black leading-[1.25] tracking-[0.01em] text-black">
                {politician.name}
              </span>
            </div>
            {politician.title && (
              <span className="text-[14px] font-bold tracking-[0.02em] text-[#238778]">
                {politician.title}
              </span>
            )}
            <span className="text-[12px] font-medium tabular-nums text-[#6B7280]">
              {[period, updatedAt].filter((text) => text).join("　")}
            </span>
            <PoliticianSnsLinks
              name={politician.name}
              profileUrl={politician.profileUrl}
              websiteUrl={politician.websiteUrl}
              snsUrls={politician.snsUrls}
            />
          </div>
          {hasYearSwitch && (
            <div className="flex-shrink-0">
              <YearSegment years={years} currentYear={currentYear} tone="plain" />
            </div>
          )}
        </div>

        {/* SP */}
        <div className="mist-surface grid min-h-[134px] grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr_auto] items-center gap-x-3 gap-y-3 rounded-[24px] px-[18px] pb-4 pt-[18px] md:hidden">
          <PoliticianAvatar
            photoUrl={photoUrl}
            alt={photoAlt}
            className="col-start-1 row-start-1 h-[52px] w-[52px] shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)]"
          />
          <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
            <span className="text-[20px] font-black leading-[1.3] tracking-[0.01em]">
              {politician.name}
            </span>
            <span className="text-[13px] font-semibold text-[#0A1A17]/80">議員の調研費</span>
          </span>
          <div className="col-span-full row-start-3 flex flex-wrap items-end justify-between gap-2 self-end">
            {updatedAt && (
              <span className="text-[12px] font-semibold leading-none tracking-[0.02em] text-[#0A1A17]/80">
                {updatedAt}
              </span>
            )}
            <div className="ml-auto">
              {hasYearSwitch ? (
                <YearSegment years={years} currentYear={currentYear} />
              ) : (
                <span className="whitespace-nowrap text-[13px] font-bold leading-none tracking-[0.02em]">
                  {period}
                </span>
              )}
            </div>
          </div>
        </div>

        {nav && (
          <>
            <Link
              href={nav.prev.href}
              aria-label={`前の議員（${nav.prev.name}）の調研費へ`}
              title={`前の議員（${nav.prev.name}）の調研費へ`}
              className={`${NAV_BUTTON_CLASS} -left-3.5 md:-left-5`}
            >
              <Chevron direction="prev" />
            </Link>
            <Link
              href={nav.next.href}
              aria-label={`次の議員（${nav.next.name}）の調研費へ`}
              title={`次の議員（${nav.next.name}）の調研費へ`}
              className={`${NAV_BUTTON_CLASS} -right-3.5 md:-right-5`}
            >
              <Chevron direction="next" />
            </Link>
          </>
        )}
      </div>

      {nav && (
        <nav
          aria-label={
            currentIndex === -1
              ? "議員を選ぶ"
              : `議員を選ぶ（${currentIndex + 1} / ${nav.members.length}）`
          }
          className="mt-3.5 flex items-center justify-center gap-0.5 md:hidden"
        >
          {nav.members.map((member) => (
            <Link
              key={member.slug}
              href={member.href}
              aria-label={`${member.name}の調研費${member.current ? "（表示中）" : ""}`}
              aria-current={member.current ? "page" : undefined}
              className={`flex h-6 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0F8472] ${
                member.current ? "w-[30px]" : "w-5"
              }`}
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                  member.current ? "w-[22px] bg-[#0F8472]" : "w-1.5 bg-[#0F8472]/25"
                }`}
              />
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
