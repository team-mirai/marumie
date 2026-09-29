import "server-only";
import type {
  PublishedAccount,
  PublishedPoliticianResearchFund,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type {
  ResearchFundPartyPoliticianView,
  ResearchFundPartySummaryData,
} from "@/server/contexts/research-fund/domain/models/research-fund-party-summary";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import {
  buildCoverageLabel,
  buildGrantPeriodLabel,
} from "@/server/contexts/research-fund/domain/services/research-fund-coverage";
import { buildResearchFundSankey } from "@/server/contexts/research-fund/domain/services/research-fund-sankey-builder";
import {
  aggregateResearchFund,
  type ResearchFundAggregation,
  type ResearchFundRow,
} from "@/shared/research-fund/aggregation";
import type { SankeyData } from "@/types/sankey";

export interface GetResearchFundPartySummaryParams {
  slug: string;
  financialYear: number;
}

const EMPTY_SANKEY: SankeyData = { nodes: [], links: [] };

export class GetResearchFundPartySummaryUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 政党トップページの調研費サマリーのデータ。所属議員がいなければ null を返し、呼び出し側がセクションを出さない
   * （所属議員のいない政治団体では既存の表示を変えない）。
   */
  async execute(
    params: GetResearchFundPartySummaryParams,
  ): Promise<ResearchFundPartySummaryData | null> {
    const published = await this.repository.findPublishedByOrganization(
      params.slug,
      params.financialYear,
    );
    if (!published) return null;

    const politicians = published.politicians.map(buildPoliticianView);

    return {
      organization: published.organization,
      financialYear: published.financialYear,
      asOfDate: latestAsOfDate(published.politicians),
      grantPeriodLabel: buildPartyGrantPeriodLabel(published.politicians),
      politicians,
    };
  }
}

/** SP の末尾に出す「2026年2月〜8月支給分」。公開中の議員全員分の範囲をまとめる。 */
function buildPartyGrantPeriodLabel(
  politicians: readonly PublishedPoliticianResearchFund[],
): string | null {
  const coverages = politicians.filter((item) => item.rows.length > 0).map(toCoverageInput);
  const publishedThroughs = coverages
    .map((coverage) => coverage.publishedThrough)
    .filter((month): month is string => month !== null);
  return buildGrantPeriodLabel({
    months: coverages.flatMap((coverage) => coverage.months),
    publishedThrough:
      publishedThroughs.length > 0 ? publishedThroughs.reduce((a, b) => (a > b ? a : b)) : null,
  });
}

function buildPoliticianView(
  published: PublishedPoliticianResearchFund,
): ResearchFundPartyPoliticianView {
  // published の仕訳が1件も無い議員は「準備中」。グラフも KPI も描かず、チップだけグレーで残す。
  if (published.rows.length === 0) {
    return {
      slug: published.politician.slug,
      name: published.politician.name,
      ready: false,
      statusLabel: "準備中",
      kpi: { granted: 0, spent: 0 },
      sankey: { detailed: EMPTY_SANKEY, legal: EMPTY_SANKEY },
    };
  }

  const detailed = aggregate(published.rows, published.accounts, "detailed");
  const legal = aggregate(published.rows, published.accounts, "legal");

  return {
    slug: published.politician.slug,
    name: published.politician.name,
    ready: true,
    statusLabel: buildCoverageLabel([toCoverageInput(published)]),
    kpi: detailed.kpi,
    sankey: {
      detailed: buildResearchFundSankey(detailed),
      legal: buildResearchFundSankey(legal),
    },
  };
}

function toCoverageInput(published: PublishedPoliticianResearchFund) {
  return {
    months: published.rows.map((row) => row.date.slice(0, 7)),
    publishedThrough: published.publishedThrough?.slice(0, 7) ?? null,
  };
}

function aggregate(
  rows: readonly ResearchFundRow[],
  accounts: Readonly<Record<string, PublishedAccount>>,
  mode: "detailed" | "legal",
): ResearchFundAggregation {
  const result = aggregateResearchFund(rows, accounts, mode);
  if (result.status === "invalid")
    throw new Error(
      `調研費の集計に失敗しました: ${result.errors.map((error) => `${error.path} ${error.message}`).join(", ")}`,
    );
  return result.value;
}

/** 「2026.8.20更新」。公開中の議員のうち最も新しい as_of_date を代表に使う。 */
function latestAsOfDate(politicians: readonly PublishedPoliticianResearchFund[]): string | null {
  const dates = politicians
    .filter((item) => item.rows.length > 0)
    .map((item) => item.asOfDate)
    .filter((date): date is string => date !== null);
  return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}
