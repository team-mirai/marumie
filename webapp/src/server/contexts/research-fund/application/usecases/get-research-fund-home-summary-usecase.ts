import "server-only";
import type {
  PublishedAccount,
  PublishedPoliticianResearchFund,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type {
  ResearchFundHomePoliticianView,
  ResearchFundHomeSummaryData,
} from "@/server/contexts/research-fund/domain/models/research-fund-home-summary";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { buildGrantPeriodLabel } from "@/server/contexts/research-fund/domain/services/research-fund-coverage";
import { buildResearchFundSankey } from "@/server/contexts/research-fund/domain/services/research-fund-sankey-builder";
import {
  aggregateResearchFund,
  type ResearchFundAggregation,
  type ResearchFundRow,
} from "@/shared/research-fund/aggregation";

export interface GetResearchFundHomeSummaryParams {
  financialYear: number;
}

export class GetResearchFundHomeSummaryUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * トップページの「所属議員の調研費」のデータ。調研費を公開中で、その年度に published の仕訳がある議員を全員並べる。
   * どの政治団体に所属しているか（所属があるか）には左右されない。
   * 調研費を「公開しない」議員は repository の段階で外れる。
   * 並べる議員がいなければ null を返し、呼び出し側がセクションを出さない。
   */
  async execute(
    params: GetResearchFundHomeSummaryParams,
  ): Promise<ResearchFundHomeSummaryData | null> {
    const published = await this.repository.findPublishedForHome(params.financialYear);

    // published の仕訳が1件も無い議員は「準備中」。カードもグラフも出さない。
    const politicians = published.filter((item) => item.rows.length > 0).map(buildPoliticianView);
    if (politicians.length === 0) return null;

    return { financialYear: params.financialYear, politicians };
  }
}

function buildPoliticianView(
  published: PublishedPoliticianResearchFund,
): ResearchFundHomePoliticianView {
  const detailed = aggregate(published.rows, published.accounts, "detailed");
  const legal = aggregate(published.rows, published.accounts, "legal");

  return {
    slug: published.politician.slug,
    name: published.politician.name,
    nameKana: published.politician.nameKana,
    house: published.politician.house,
    hasPhoto: published.politician.hasPhoto,
    asOfDate: published.asOfDate,
    grantPeriodLabel: buildGrantPeriodLabel({
      months: published.rows.map((row) => row.date.slice(0, 7)),
      publishedThrough: published.publishedThrough?.slice(0, 7) ?? null,
    }),
    kpi: detailed.kpi,
    sankey: {
      detailed: buildResearchFundSankey(detailed),
      legal: buildResearchFundSankey(legal),
    },
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
