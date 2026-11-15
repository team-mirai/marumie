import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import TransparencySection from "@/client/components/common/TransparencySection";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import BalanceSheetSection from "@/client/components/top-page/BalanceSheetSection";
import MonthlyTrendsSection from "@/client/components/top-page/MonthlyTrendsSection";
import OrganizationCashFlowSection from "@/client/components/top-page/OrganizationCashFlowSection";
import OrganizationHeadingSection from "@/client/components/top-page/OrganizationHeadingSection";
import PartyHeadingSection from "@/client/components/top-page/PartyHeadingSection";
import TransactionsSection from "@/client/components/top-page/TransactionsSection";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadOrganizationProfile } from "@/server/contexts/public-finance/presentation/loaders/load-organization-profile";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { getBalanceSheetAsOf } from "@/client/lib/balance-sheet-heading";
import { buildProfileLinks } from "@/client/lib/profile-links";

export const revalidate = 300; // 5 minutes

const VALID_YEARS = [2025, 2026] as const;
const DEFAULT_YEAR = 2026;

// 政党ページとして見せる団体。ほかは政治団体ページ（代表者の写真・SNS の見出し）にする。
// シードの sample-party は、E2E で政党ページを確かめるために政党として扱う
const PARTY_SLUGS: readonly string[] = ["team-mirai", "sample-party"];

interface OrgPageProps {
  params: Promise<{
    slug: string;
    year: string;
  }>;
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug } = await params;

  const { organizations } = await loadOrganizations();
  const currentOrganization = organizations.find((org) => org.slug === slug);

  const title = currentOrganization?.displayName
    ? `${currentOrganization.displayName} - みらいまる見え政治資金`
    : "みらいまる見え政治資金";

  return {
    title,
  };
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { slug, year: yearParam } = await params;

  // 年度の妥当性をチェック
  const yearNumber = parseInt(yearParam, 10);
  const financialYear = VALID_YEARS.includes(yearNumber as (typeof VALID_YEARS)[number])
    ? yearNumber
    : DEFAULT_YEAR;

  // 年度が不正な場合はデフォルト年度にリダイレクト
  if (financialYear !== yearNumber) {
    redirect(`/o/${slug}/${DEFAULT_YEAR}`);
  }

  // slugの妥当性をチェックし、必要に応じてリダイレクト
  const { default: defaultSlug, organizations } = await loadOrganizations();
  if (!organizations.some((org) => org.slug === slug)) {
    redirect(`/o/${defaultSlug}/${financialYear}`);
  }

  const slugs = [slug];

  // 現在のslugに対応する組織を取得
  const currentOrganization = organizations.find((org) => org.slug === slug);
  const organizationName = currentOrganization?.displayName || "未登録の政治団体";

  // 統合アクションで全データを取得
  const data = await loadTopPageData({
    slugs,
    page: 1,
    perPage: 6, // 表示用に6件のみ取得
    financialYear,
  }).catch((error) => {
    console.error("loadTopPageData error:", error);
    return null;
  });

  const updatedAt = formatUpdatedAt(data?.transactionData?.lastUpdatedAt ?? null);
  const eyebrow = `${organizationName}・${financialYear}年`;
  const years = VALID_YEARS.map((y) => ({ year: y, href: `/o/${slug}/${y}` }));
  const isParty = PARTY_SLUGS.includes(slug);

  const profile = isParty
    ? null
    : await loadOrganizationProfile(slug).catch((error) => {
        console.error("loadOrganizationProfile error:", error);
        return null;
      });
  const photoVersion = profile?.photoVersion;

  const latterSections = (
    <>
      <BalanceSheetSection
        data={data?.balanceSheetData}
        updatedAt={getBalanceSheetAsOf(financialYear, updatedAt)}
        eyebrow={eyebrow}
      />
      <TransactionsSection
        transactionData={data?.transactionData ?? null}
        updatedAt={updatedAt}
        slug={slug}
        year={financialYear}
        eyebrow={eyebrow}
      />
      <SiteBottomBlock />
    </>
  );

  if (!isParty) {
    return (
      <MainColumn spacing="compact">
        <div className="flex flex-col gap-5">
          <Breadcrumbs current={`${organizationName}の収支`} />
          <OrganizationHeadingSection
            organizationName={organizationName}
            subtitle={`${currentOrganization?.orgName || organizationName}・${financialYear}年`}
            photoUrl={
              photoVersion
                ? `/api/organizations/${encodeURIComponent(slug)}/photo?v=${encodeURIComponent(photoVersion)}`
                : null
            }
            links={buildProfileLinks(profile?.websiteUrl ?? null, profile?.snsUrls ?? [])}
            years={years}
            currentYear={financialYear}
          />
        </div>
        <OrganizationCashFlowSection
          eyebrow={eyebrow}
          updatedAt={updatedAt}
          political={data?.political ?? null}
          friendly={data?.friendly ?? null}
        />
        <MonthlyTrendsSection
          monthlyData={data?.monthlyData}
          updatedAt={updatedAt}
          eyebrow={eyebrow}
        />
        {latterSections}
      </MainColumn>
    );
  }

  return (
    <MainColumn spacing="compact">
      <div className="flex flex-col gap-5">
        <Breadcrumbs current={`${organizationName}の収支`} />
        <PartyHeadingSection
          organizationName={organizationName}
          slug={slug}
          year={financialYear}
          years={VALID_YEARS}
          updatedAt={updatedAt}
          political={data?.political ?? null}
          friendly={data?.friendly ?? null}
        />
      </div>
      <MonthlyTrendsSection
        monthlyData={data?.monthlyData}
        updatedAt={updatedAt}
        eyebrow={eyebrow}
      />
      <TransparencySection title="党首もこれを見て、お金をやりくりしています👀" />
      {latterSections}
    </MainColumn>
  );
}
