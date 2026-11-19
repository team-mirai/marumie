import "server-only";
import HomeResearchFundMembers, {
  type HomeResearchFundMember,
} from "@/client/components/home/HomeResearchFundMembers";
import HomeSectionHeading from "@/client/components/home/HomeSectionHeading";
import ResearchFundIntroLinks from "@/client/components/research-fund/ResearchFundIntroLinks";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { politicianPageHref } from "@/client/lib/politician-nav";
import { politicianPhotoUrl } from "@/client/lib/politician-photo-url";
import type { ResearchFundHomeSummaryData } from "@/server/contexts/research-fund/domain/models/research-fund-home-summary";

interface Props {
  data: ResearchFundHomeSummaryData;
}

/**
 * トップページの「所属議員の調研費」（v9）。調研費の説明と使用方針へのリンクの下に、調研費を公開中の議員を並べ、
 * 選んだ議員の調研費（金額と収支の流れ）をその場で出す。2年分以上を公開している議員はその場で年を切り替えられる。
 */
export default function HomeResearchFundSection({ data }: Props) {
  const members: HomeResearchFundMember[] = data.politicians.map((politician) => ({
    slug: politician.slug,
    name: politician.name,
    photoUrl: politician.hasPhoto ? politicianPhotoUrl(politician.slug) : null,
    years: politician.years.map((year) => ({
      year: year.financialYear,
      href: politicianPageHref(politician.slug, year.financialYear),
      updatedAt: formatUpdatedAt(year.asOfDate),
      periodLabel: year.grantPeriodLabel,
      kpi: year.kpi,
      sankey: year.sankey,
    })),
  }));

  return (
    <section
      id="home-rf"
      aria-labelledby="home-rf-heading"
      className="mt-[7px] flex flex-col gap-[clamp(28px,3.4vw,44px)] py-[clamp(8px,1.5vw,16px)] min-[641px]:-mt-4"
    >
      {/* 見出しと「調研費とは」の間は詰める（PC 20px・SP 16px） */}
      <div className="flex flex-col gap-[clamp(16px,1.6vw,20px)]">
        <HomeSectionHeading
          id="home-rf-heading"
          title="所属議員の調研費"
          description="議員に毎月100万円支給される公費を何に使ったか"
        />

        <ResearchFundIntroLinks />
      </div>

      <HomeResearchFundMembers members={members} defaultYear={data.financialYear} />
    </section>
  );
}
