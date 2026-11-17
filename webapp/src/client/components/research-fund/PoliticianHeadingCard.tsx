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
  /** 調研費を公開している年と、その年のページの URL。年度が 1 つだけなら切り替えではなく年だけのタグにする */
  years: { year: number; href: string }[];
  currentYear: number;
  /** 例: 「2026年2-8月分」。公開月が無ければ null */
  periodLabel: string | null;
  /** 前後の議員への切り替え。公開中の議員が 1 人以下なら null（出さない） */
  nav: PoliticianNav<PoliticianNavLink> | null;
}

/**
 * SP の年の切り替え。最初の年から最後の年までを並べ、途中でデータの無い年は押せないようにして理由を添える。
 */
function spYearOptions(years: Props["years"]) {
  const hrefByYear = new Map(years.map(({ year, href }) => [year, href]));
  const sorted = years.map(({ year }) => year).sort((a, b) => a - b);
  const options = [];
  for (let year = sorted[0]; year <= sorted[sorted.length - 1]; year++) {
    const href = hrefByYear.get(year);
    options.push(
      href
        ? { year, href }
        : { year, href: null, unavailableReason: `${year}年分の調研費はありません` },
    );
  }
  return options;
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

// SP は下の位置表示（点と「10 / 12」）を除いたカードの上下中央に置く
const NAV_BUTTON_CLASS =
  "absolute top-[calc(50%-30px)] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 bg-white/60 text-[#0B0F0E] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_26px_-12px_rgba(10,60,52,0.5),0_2px_6px_rgba(10,60,52,0.1)] backdrop-blur-[14px] transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] active:scale-[0.86] min-[641px]:top-1/2 min-[641px]:h-10 min-[641px]:w-10 min-[641px]:border-0 min-[641px]:bg-white min-[641px]:shadow-[0_2px_6px_rgba(11,15,14,0.10),0_8px_20px_rgba(11,15,14,0.10)] min-[641px]:backdrop-blur-none min-[641px]:hover:bg-[#E2F6F3] min-[641px]:hover:text-[#0F8472]";

/**
 * 議員ページ冒頭の議員カード。
 * PC は白いカード（顔写真・「{名前}の調研費」・期間・プロフィールと SNS・年の切り替え）。
 * SP はトップの議員カードと同じ情報設計のミストグラデーションのカード（顔写真・名前・「調研費・期間」・左下に年）にし、
 * カードの中に更新日は置かない。
 * 左右のボタンで前後の議員の調研費ページへ移り、SP はカードの下に何人目かを点（飾り）と「10 / 12」の文字で出す。
 */
export default function PoliticianHeadingCard({
  politician,
  photoUrl,
  years,
  currentYear,
  periodLabel,
  nav,
}: Props) {
  const photoAlt = `${politician.name}の写真`;
  const period = periodLabel ?? `${currentYear}年`;
  const hasYearSwitch = years.length > 1;
  const currentIndex = nav?.members.findIndex((member) => member.current) ?? -1;

  return (
    <section aria-label="議員情報" className="relative">
      {/* PC */}
      <div className="hidden items-center gap-5 rounded-[32px] bg-white px-8 py-7 min-[641px]:flex">
        <PoliticianAvatar photoUrl={photoUrl} alt={photoAlt} className="h-[88px] w-[88px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[30px] font-black leading-[1.25] tracking-[0.01em] text-black">
            {politician.name}の調研費
          </span>
          <span className="text-[14px] font-bold tracking-[0.02em] text-[#238778]">{period}</span>
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
      <div className="mist-surface grid min-h-[134px] grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_1fr_auto] items-center gap-x-3 gap-y-3 rounded-[24px] px-[18px] pb-4 pt-[18px] min-[641px]:hidden">
        <PoliticianAvatar
          photoUrl={photoUrl}
          alt={photoAlt}
          className="col-start-1 row-start-1 h-[52px] w-[52px] shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)]"
        />
        <span className="col-start-2 row-start-1 flex min-w-0 flex-col gap-1">
          <span className="text-[20px] font-black leading-[1.3] tracking-[0.01em]">
            {politician.name}
          </span>
          <span className="text-[13px] font-bold text-[#0A1A17]/80">調研費・{period}</span>
        </span>
        {/* トップの議員カードと同じく左下に年。年が1つだけなら押せる切り替えと見分けがつくよう枠のない文字だけのタグにする */}
        <div className="col-span-full row-start-3 self-end justify-self-start">
          {hasYearSwitch ? (
            <YearSegment years={spYearOptions(years)} currentYear={currentYear} />
          ) : (
            <span className="flex h-10 items-center pl-1 text-[14px] font-bold leading-none tabular-nums text-[#0A1A17]/80">
              {currentYear}年
            </span>
          )}
        </div>
      </div>

      {nav && (
        <>
          <Link
            href={nav.prev.href}
            aria-label={`前の議員（${nav.prev.name}）の調研費へ`}
            title={`前の議員（${nav.prev.name}）の調研費へ`}
            className={`${NAV_BUTTON_CLASS} -left-3.5 min-[641px]:-left-5`}
          >
            <Chevron direction="prev" />
          </Link>
          <Link
            href={nav.next.href}
            aria-label={`次の議員（${nav.next.name}）の調研費へ`}
            title={`次の議員（${nav.next.name}）の調研費へ`}
            className={`${NAV_BUTTON_CLASS} -right-3.5 min-[641px]:-right-5`}
          >
            <Chevron direction="next" />
          </Link>

          {/* SP：何人目かの表示。点は飾りにして、位置は文字で伝える */}
          <div className="mt-3.5 flex h-6 items-center justify-center min-[641px]:hidden">
            <div aria-hidden="true" className="flex items-center gap-0.5">
              {nav.members.map((member) => (
                <span
                  key={member.slug}
                  className={`flex h-6 items-center justify-center ${member.current ? "w-[30px]" : "w-5"}`}
                >
                  <span
                    className={`block h-1.5 rounded-full transition-[width,background-color] duration-500 ${
                      member.current ? "w-[22px] bg-[#0F8472]" : "w-1.5 bg-[#0F8472]/25"
                    }`}
                  />
                </span>
              ))}
            </div>
            {currentIndex !== -1 && (
              <span className="ml-2.5 text-[12px] font-bold leading-none tabular-nums text-[#4B5563]">
                <span aria-hidden="true">
                  {currentIndex + 1} / {nav.members.length}
                </span>
                <span className="sr-only">
                  公開中の議員{nav.members.length}人のうち{currentIndex + 1}人目
                </span>
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
