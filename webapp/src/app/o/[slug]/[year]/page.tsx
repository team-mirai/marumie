import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import TransparencySection from "@/client/components/common/TransparencySection";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import RevealOnScroll from "@/client/components/layout/RevealOnScroll";
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
import { shareMetadata } from "@/app/site-metadata";
import {
  DEFAULT_YEAR,
  PARTY_SLUGS,
  VALID_YEARS,
  isValidYear,
} from "@/app/o/[slug]/[year]/organization-page-config";

export const revalidate = 300; // 5 minutes

interface OrgPageProps {
  params: Promise<{
    slug: string;
    year: string;
  }>;
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug, year } = await params;

  const { organizations } = await loadOrganizations();
  const currentOrganization = organizations.find((org) => org.slug === slug);

  // 見つからなければサイト名だけのタイトルとトップの画像（ルートの既定）にする
  if (!currentOrganization?.displayName) return {};
  const title = `${currentOrganization.displayName}の収支`;
  // シェアしたときの画像は、その団体・その年の収支の図（データが無ければ画像の側でトップの画像を返す）
  return isValidYear(Number(year))
    ? {
        title,
        ...shareMetadata({
          url: `/o/${encodeURIComponent(slug)}/${year}/og-image`,
          alt: `${title}（${year}年）`,
        }),
      }
    : { title };
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { slug, year: yearParam } = await params;

  // 年度の妥当性をチェック
  const yearNumber = parseInt(yearParam, 10);
  const financialYear = isValidYear(yearNumber) ? yearNumber : DEFAULT_YEAR;

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
  const pageTitle = `${organizationName}の収支`;
  const breadcrumbLabel = `${pageTitle}・${financialYear}年`;

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
      <Breadcrumbs current={breadcrumbLabel} position="bottom" />
      <RevealOnScroll />
    </>
  );

  if (!isParty) {
    return (
      <MainColumn spacing="compact">
        <div className="flex flex-col gap-5">
          <Breadcrumbs current={breadcrumbLabel} />
          <h1 className="sr-only">{pageTitle}</h1>
          <OrganizationHeadingSection
            organizationName={organizationName}
            formalName={currentOrganization?.orgName || organizationName}
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
        <Breadcrumbs current={breadcrumbLabel} />
        <PartyHeadingSection
          organizationName={organizationName}
          slug={slug}
          hasPhoto={currentOrganization?.hasPhoto ?? false}
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
      <TransparencySection variant="party" />
      {latterSections}
    </MainColumn>
  );
}
