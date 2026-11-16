import "server-only";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import PartyLogo from "@/client/components/common/PartyLogo";
import HomeOrganizationCard from "@/client/components/home/HomeOrganizationCard";
import HomeResearchFundSection from "@/client/components/home/HomeResearchFundSection";
import HomeSectionHeading from "@/client/components/home/HomeSectionHeading";
import OrganizationAvatar from "@/client/components/home/OrganizationAvatar";
import MainColumn from "@/client/components/layout/MainColumn";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { loadHomePageData } from "@/server/contexts/public-finance/presentation/loaders/load-home-page-data";
import { loadResearchFundHomeSummary } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-home-summary";

export const revalidate = 300; // 5 minutes

// 政治団体ページ（/o/[slug]/[year]）で選べる年度とそろえる
const YEARS = [2025, 2026] as const;
const DEFAULT_YEAR = 2026;

/** トップページ。政党の収支・所属議員の調研費・政治団体の収支をカードで並べ、それぞれのページへの入口にする。 */
export default async function HomePage() {
  const data = await loadHomePageData(YEARS).catch((error) => {
    console.error("loadHomePageData error:", error);
    return null;
  });
  const updatedAt = formatUpdatedAt(data?.lastUpdatedAt ?? null);
  // 所属議員の調研費は、政党カードの有無に関係なく調研費を公開中の議員を全員出す。
  // 取れなくても他のカードは出せるので、失敗したら出さないだけにする
  const researchFund = await loadResearchFundHomeSummary({ financialYear: DEFAULT_YEAR }).catch(
    (error) => {
      console.error("loadResearchFundHomeSummary error:", error);
      return null;
    },
  );

  return (
    <MainColumn spacing="compact" width="wide">
      <h1 className="sr-only">みらいまる見え政治資金</h1>
      {data && data.parties.length > 0 && (
        <section id="home-party" aria-label="政党の収支" className="flex flex-col gap-8">
          {data.parties.map((party) => (
            <HomeOrganizationCard
              key={party.slug}
              tone="party"
              slug={party.slug}
              name={party.displayName}
              title={`${party.displayName}の収支`}
              avatar={<PartyLogo />}
              updatedAt={updatedAt}
              years={party.years}
              defaultYear={DEFAULT_YEAR}
            />
          ))}
        </section>
      )}
      {researchFund && <HomeResearchFundSection data={researchFund} />}
      {data && data.groups.length > 0 && (
        <section
          id="home-groups"
          aria-labelledby="home-groups-heading"
          className="flex flex-col gap-[clamp(28px,3.4vw,44px)] py-2 min-[641px]:py-4"
        >
          <HomeSectionHeading
            id="home-groups-heading"
            title="議員の政治団体"
            description="議員の政治団体はどこからお金を得て何に使っているか"
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-8 min-[641px]:gap-3">
            {data.groups.map((group) => (
              <HomeOrganizationCard
                key={group.slug}
                tone="group"
                slug={group.slug}
                name={group.displayName}
                subtitle={group.orgName ?? undefined}
                avatar={
                  <OrganizationAvatar
                    slug={group.slug}
                    alt={`${group.displayName}の代表者の写真`}
                    hasPhoto={group.hasPhoto}
                  />
                }
                updatedAt={updatedAt}
                years={group.years}
                defaultYear={DEFAULT_YEAR}
                // 横に並べて幅が狭くなるときは金額を小さくする
                amountSize={data.groups.length > 1 ? "compact" : "default"}
                headingLevel="h3"
              />
            ))}
          </div>
        </section>
      )}
      <SiteBottomBlock notesVariant="home" />
    </MainColumn>
  );
}
