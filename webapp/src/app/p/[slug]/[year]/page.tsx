import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";
import ResearchFundSurveyCard from "@/client/components/common/ResearchFundSurveyCard";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import RevealOnScroll from "@/client/components/layout/RevealOnScroll";
import OtherPoliticiansSection from "@/client/components/research-fund/OtherPoliticiansSection";
import PoliticianHeadingCard from "@/client/components/research-fund/PoliticianHeadingCard";
import ResearchFundBottomBlock from "@/client/components/research-fund/ResearchFundBottomBlock";
import { ResearchFundCrossLinkProvider } from "@/client/components/research-fund/ResearchFundCrossLink";
import ResearchFundExpensesSection from "@/client/components/research-fund/ResearchFundExpensesSection";
import ResearchFundFlowSection from "@/client/components/research-fund/ResearchFundFlowSection";
import ResearchFundHighlightsSection from "@/client/components/research-fund/ResearchFundHighlightsSection";
import ResearchFundMonthlySection from "@/client/components/research-fund/ResearchFundMonthlySection";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { shareMetadata } from "@/app/site-metadata";
import { buildPoliticianNav, politicianPageHref } from "@/client/lib/politician-nav";
import { politicianPhotoUrl } from "@/client/lib/politician-photo-url";
import type { ResearchFundPoliticianCard } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { loadResearchFundPoliticianCards } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politician-cards";
import { loadResearchFundPageByPath } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page-by-path";

export const revalidate = 300; // 5 minutes

interface PoliticianPageProps {
  params: Promise<{ slug: string; year: string }>;
}

/** 年度が数字でない URL では DB を引かずに 404 にする。 */
function parseYear(year: string): number | null {
  return /^\d{4}$/.test(year) ? Number(year) : null;
}

export async function generateMetadata({ params }: PoliticianPageProps): Promise<Metadata> {
  const { slug, year } = await params;
  const financialYear = parseYear(year);
  const page = financialYear
    ? await loadResearchFundPageByPath({ pathSlug: slug, financialYear })
    : null;
  // 見つからなければサイト名だけのタイトルとトップの画像（ルートの既定）にする
  if (!page) return {};
  const title = `${page.data.politician.name}の調研費`;

  return {
    title,
    // シェアしたときの画像は、その議員・その年の調研費の図（データが無ければ画像の側でトップの画像を返す）。
    // プレビュー URL のページは、画像もプレビュー URL で作る（公開していない議員の画像は公開 URL から取れない）
    ...shareMetadata({
      url: `/p/${encodeURIComponent(slug)}/${year}/og-image`,
      alt: `${title}（${year}年）`,
    }),
    // プレビュー URL（調研費を「公開しない」議員のページはこれでしか開けない）は検索エンジンに載せない。
    ...(page.isPreview && { robots: { index: false } }),
  };
}

export default async function PoliticianPage({ params }: PoliticianPageProps) {
  const { slug, year } = await params;
  const financialYear = parseYear(year);
  const page = financialYear
    ? await loadResearchFundPageByPath({ pathSlug: slug, financialYear })
    : null;
  if (!page) notFound();
  const { data, pathSlug } = page;
  const photoUrl = data.politician.hasPhoto ? politicianPhotoUrl(pathSlug) : null;

  // 「2026.8.20 更新」。未設定なら公開範囲の最終日で代用する。
  const updatedAt = formatUpdatedAt(data.asOfDate ?? null);
  const hasHighlights = data.policyComment !== null || data.groups.length > 0;
  const eyebrow = `${data.politician.name}の調研費・${data.financialYear}年`;
  const pageTitle = `${data.politician.name}の調研費`;

  // 前後の切り替え・ほかの議員は、調研費を公開中の議員だけ（非公開の議員はプレビュー中でも出さない）。
  // 取れなくても本文は出せるので、失敗したら出さないだけにする。
  const cards = await loadResearchFundPoliticianCards({
    financialYear: data.financialYear,
  }).catch((error) => {
    console.error("loadResearchFundPoliticianCards error:", error);
    return [] as ResearchFundPoliticianCard[];
  });
  const nav = buildPoliticianNav(
    cards.map((card) => ({
      ...card,
      href: politicianPageHref(card.slug, data.financialYear),
      photoUrl: card.hasPhoto ? politicianPhotoUrl(card.slug) : null,
    })),
    data.politician.slug,
  );

  return (
    <MainColumn spacing="compact">
      <div className="flex flex-col gap-5">
        <Breadcrumbs current={pageTitle} />
        <h1 className="sr-only">{pageTitle}</h1>
        <PoliticianHeadingCard
          politician={data.politician}
          photoUrl={photoUrl}
          years={data.years.map((year) => ({ year, href: politicianPageHref(pathSlug, year) }))}
          currentYear={data.financialYear}
          periodLabel={data.grantPeriodLabel}
          nav={nav}
        />
      </div>
      <ResearchFundFlowSection data={data} eyebrow={eyebrow} updatedAt={updatedAt} />
      {/* 用途カードと「すべての出入金」が相互にジャンプするので、その間をまとめて包む */}
      <ResearchFundCrossLinkProvider>
        {hasHighlights && (
          <ResearchFundHighlightsSection
            data={data}
            photoUrl={photoUrl}
            eyebrow={eyebrow}
            updatedAt={updatedAt}
          />
        )}
        <GradientMessageCard title="調研費もまるごと公開。意味ある使い方か、検証できるように👀">
          議員一人ひとりに支給される調研費の原資は、大切な税金。だから使わせていただいた分は1件ずつ公開し、その使用方針や主要な用途もわかりやすく伝えていくことが重要だと考えています。
        </GradientMessageCard>
        <ResearchFundMonthlySection data={data} eyebrow={eyebrow} updatedAt={updatedAt} />
        <ResearchFundExpensesSection
          data={data}
          pathSlug={pathSlug}
          eyebrow={eyebrow}
          updatedAt={updatedAt}
        />
      </ResearchFundCrossLinkProvider>
      <ResearchFundSurveyCard headingId="politician-survey-heading" />
      {nav && <OtherPoliticiansSection politicians={nav.others} />}
      <ResearchFundBottomBlock dataNote={data.dataNote} notesVariant="member" />
      <Breadcrumbs current={pageTitle} position="bottom" />
      <RevealOnScroll />
    </MainColumn>
  );
}
