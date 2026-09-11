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
import { buildCoverageLabel } from "@/server/contexts/research-fund/domain/services/research-fund-coverage";
import {
  aggregateResearchFund,
  type ResearchFundAggregation,
  type ResearchFundRow,
} from "@/shared/research-fund/aggregation";

export interface GetResearchFundPartySummaryParams {
  slug: string;
  financialYear: number;
}

export class GetResearchFundPartySummaryUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 政党ページ A-6 のデータ。所属議員がいなければ null を返し、呼び出し側が A-6 を出さない
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
      coverageLabel: buildPartyCoverageLabel(published.politicians),
      politicians,
    };
  }
}

/**
 * 「2026年2月〜8月分を公開中（サンプル 太郎のみ）」。
 * 公開しているのが所属議員の一部だけなら、誰の分なのかを添える。
 */
function buildPartyCoverageLabel(politicians: readonly PublishedPoliticianResearchFund[]): string {
  const publishedOnes = politicians.filter((item) => item.rows.length > 0);
  const label = buildCoverageLabel(publishedOnes.map(toCoverageInput));
  if (publishedOnes.length === 0 || publishedOnes.length === politicians.length) return label;
  return `${label}（${publishedOnes.map((item) => item.politician.name).join("・")}のみ）`;
}

function buildPoliticianView(
  published: PublishedPoliticianResearchFund,
): ResearchFundPartyPoliticianView {
  // published の仕訳が1件も無い議員は「準備中」。グラフも KPI も描かず、行だけグレーで残す。
  if (published.rows.length === 0) {
    return {
      slug: published.politician.slug,
      name: published.politician.name,
      ready: false,
      statusLabel: "準備中",
      kpi: { granted: 0, spent: 0 },
      count: 0,
      bars: { detailed: [], legal: [] },
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
    count: published.expenseCount,
    bars: { detailed: toBars(detailed), legal: toBars(legal) },
  };
}

function toCoverageInput(published: PublishedPoliticianResearchFund) {
  return {
    months: published.rows.map((row) => row.date.slice(0, 7)),
    publishedThrough: published.publishedThrough?.slice(0, 7) ?? null,
  };
}

/** 横棒グラフは金額の多い順。未使用分は含めない（デザイン仕様 §5）。 */
function toBars(aggregation: ResearchFundAggregation) {
  return aggregation.categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({
      key: category.key,
      label: category.label,
      amount: category.totalAmount,
    }))
    .sort((a, b) => b.amount - a.amount || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
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

/** 「2026.8.20時点」。公開中の議員のうち最も新しい as_of_date を代表に使う。 */
function latestAsOfDate(politicians: readonly PublishedPoliticianResearchFund[]): string | null {
  const dates = politicians
    .filter((item) => item.rows.length > 0)
    .map((item) => item.asOfDate)
    .filter((date): date is string => date !== null);
  return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}
