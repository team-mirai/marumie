import "server-only";
import type {
  PublishedAccount,
  PublishedPoliticianResearchFund,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type {
  ResearchFundHomePoliticianView,
  ResearchFundHomeSummaryData,
  ResearchFundHomeYearView,
} from "@/server/contexts/research-fund/domain/models/research-fund-home-summary";
import { ResearchFundPublication } from "@/server/contexts/research-fund/domain/models/research-fund-publication";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { buildGrantPeriodLabel } from "@/server/contexts/research-fund/domain/services/research-fund-coverage";
import { sortPoliticiansByKana } from "@/server/contexts/research-fund/domain/models/politician-order";
import { buildResearchFundSankey } from "@/server/contexts/research-fund/domain/services/research-fund-sankey-builder";
import {
  aggregateResearchFund,
  type ResearchFundAggregation,
  type ResearchFundRow,
} from "@/shared/research-fund/aggregation";

export interface GetResearchFundHomeSummaryParams {
  /** 並べる議員を決め、最初に出す年 */
  financialYear: number;
  /** 年の切り替えで選べる年（financialYear を含めなくてもよい）。省略時は financialYear だけ */
  years?: readonly number[];
}

export class GetResearchFundHomeSummaryUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * トップページの「所属議員の調研費」のデータ。調研費を公開中で、financialYear に published の仕訳がある議員を全員並べる。
   * どの政治団体に所属しているか（所属があるか）には左右されない。
   * 調研費を「公開しない」議員は repository の段階で外れる。
   * 並びはふりがなの五十音順。並べるのはデータを公開している議員だけなので、先頭（最初に選ばれる議員）もデータのある議員になる。
   * 議員ごとに、years のうち published の仕訳がある年の調研費も添える（2年分以上あれば年を切り替えられる）。
   * 並べる議員がいなければ null を返し、呼び出し側がセクションを出さない。
   */
  async execute(
    params: GetResearchFundHomeSummaryParams,
  ): Promise<ResearchFundHomeSummaryData | null> {
    const { financialYear } = params;
    // 先頭は financialYear（並べる議員を決める年）
    const years = [...new Set([financialYear, ...(params.years ?? [])])];
    const publishedByYear = await Promise.all(
      years.map((year) => this.repository.findPublishedForHome(year)),
    );
    const primary = publishedByYear[0];

    // published の仕訳が1件も無い年は「未公開」。その年は出さない
    const yearsBySlug = new Map<string, ResearchFundHomeYearView[]>();
    years.forEach((year, index) => {
      for (const item of publishedByYear[index]) {
        if (!ResearchFundPublication.isPublishedYear(item.rows)) continue;
        const views = yearsBySlug.get(item.politician.slug) ?? [];
        views.push(buildYearView(year, item));
        yearsBySlug.set(item.politician.slug, views);
      }
    });

    // 並べるのは financialYear を公開している議員だけ（ほかの年だけを公開している議員は並べない）
    const politicians = sortPoliticiansByKana(
      primary
        .filter((item) => ResearchFundPublication.isPublishedYear(item.rows))
        .map(
          ({ politician }): ResearchFundHomePoliticianView => ({
            slug: politician.slug,
            name: politician.name,
            nameKana: politician.nameKana,
            house: politician.house,
            hasPhoto: politician.hasPhoto,
            years: (yearsBySlug.get(politician.slug) ?? []).sort(
              (a, b) => a.financialYear - b.financialYear,
            ),
          }),
        ),
    );
    if (politicians.length === 0) return null;

    return { financialYear, politicians };
  }
}

function buildYearView(
  financialYear: number,
  published: PublishedPoliticianResearchFund,
): ResearchFundHomeYearView {
  const detailed = aggregate(published.rows, published.accounts, "detailed");
  const legal = aggregate(published.rows, published.accounts, "legal");

  return {
    financialYear,
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
