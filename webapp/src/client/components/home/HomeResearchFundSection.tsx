import "server-only";
import HomeResearchFundMembers, {
  type HomeResearchFundMember,
} from "@/client/components/home/HomeResearchFundMembers";
import HomeSectionHeading from "@/client/components/home/HomeSectionHeading";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { politicianPageHref } from "@/client/lib/politician-nav";
import { politicianPhotoUrl } from "@/client/lib/politician-photo-url";
import type { ResearchFundHomeSummaryData } from "@/server/contexts/research-fund/domain/models/research-fund-home-summary";

// noteの記事URLが決まったら差し替える（現在はチームみらいのnoteトップ）
const POLICY_NOTE_URL = "https://note.com/team_mirai_jp";

interface Props {
  data: ResearchFundHomeSummaryData;
}

/**
 * トップページの「所属議員の調研費」（v9）。調研費の説明と使用方針へのリンクの下に、調研費を公開中の議員を並べ、
 * 選んだ議員の調研費（金額と収支の流れ）をその場で出す。
 */
export default function HomeResearchFundSection({ data }: Props) {
  const members: HomeResearchFundMember[] = data.politicians.map((politician) => ({
    slug: politician.slug,
    name: politician.name,
    photoUrl: politician.hasPhoto ? politicianPhotoUrl(politician.slug) : null,
    href: politicianPageHref(politician.slug, data.financialYear),
    updatedAt: formatUpdatedAt(politician.asOfDate, { spaced: true }),
    periodLabel: politician.grantPeriodLabel,
    kpi: politician.kpi,
    sankey: politician.sankey,
  }));

  return (
    <section
      id="home-rf"
      aria-labelledby="home-rf-heading"
      className="flex flex-col gap-[clamp(28px,3.4vw,44px)] py-2 min-[641px]:py-4"
    >
      {/* 見出しと「調研費とは」の間は詰める（PC 20px・SP 16px） */}
      <div className="flex flex-col gap-[clamp(16px,1.6vw,20px)]">
        <HomeSectionHeading
          id="home-rf-heading"
          title="所属議員の調研費"
          description="議員に毎月100万円支給される公費を何に使ったか"
        />

        <div className="flex flex-col gap-2">
          <details className="group">
            <summary className="flex min-h-[30px] w-fit cursor-pointer list-none items-center gap-2.5 text-[16px] font-extrabold text-[#0F8472] hover:text-[#089781] md:text-[15px] [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                focusable="false"
                className="flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.5-2.8 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="17.4" r="1.25" fill="currentColor" />
              </svg>
              調研費（調査研究広報滞在費）とは
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="flex-shrink-0 transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="flex max-w-[820px] flex-col gap-3 pb-3 pt-2 text-[14px] leading-[1.8] text-[#1F2937] md:text-[15px] md:leading-[1.9]">
              <p className="m-0">
                調研費（調査研究広報滞在費）は、国会議員の調査研究や広報、滞在などの活動のために、国から毎月100万円支給される公費です。政治資金規正法上の「政治資金」ではありませんが、チームみらいでは透明性の観点から本サイトで公開しています。
              </p>
              <p className="m-0">
                選挙運動および政党活動には使えません。年末までに使われなかった未使用分は国庫に返納されます。
              </p>
            </div>
          </details>

          <a
            href={POLICY_NOTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="チームみらいの調研費の使用方針を読む（noteが別タブで開きます）"
            className="group flex min-h-[30px] w-fit items-center gap-2.5 text-[16px] font-extrabold text-[#0F8472] no-underline hover:text-[#089781] md:text-[15px]"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
              className="flex-shrink-0"
            >
              <path
                d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5M9 13h6M9 17h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            チームみらいの調研費の使用方針
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="flex-shrink-0 transition-transform group-hover:translate-x-[3px]"
            >
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </div>

      <HomeResearchFundMembers members={members} financialYear={data.financialYear} />
    </section>
  );
}
