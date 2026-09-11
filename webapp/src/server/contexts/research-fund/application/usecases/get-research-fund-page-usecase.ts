import "server-only";
import type {
  PublishedAccount,
  PublishedExpenditureGroup,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type {
  ResearchFundCategoryView,
  ResearchFundGroupView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { researchFundCategoryColor } from "@/server/contexts/research-fund/domain/services/research-fund-category-color";
import { parseResearchFundDetails } from "@/server/contexts/research-fund/domain/services/research-fund-details";
import { buildExpenseViews } from "@/server/contexts/research-fund/domain/services/research-fund-expense-list";
import { buildMonthlyViews } from "@/server/contexts/research-fund/domain/services/research-fund-monthly";
import { buildResearchFundSankey } from "@/server/contexts/research-fund/domain/services/research-fund-sankey-builder";
import {
  aggregateResearchFund,
  type ResearchFundAggregation,
  type ResearchFundRow,
} from "@/shared/research-fund/aggregation";
import { aggregateLinkedEntries } from "@/shared/research-fund/expenditure-group";

export interface GetResearchFundPageParams {
  slug: string;
  financialYear: number;
}

export class GetResearchFundPageUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /** 議員ページ（B-1〜B-5）のデータ。帳簿が無ければ null を返し、呼び出し側が 404 にする。 */
  async execute(params: GetResearchFundPageParams): Promise<ResearchFundPageData | null> {
    const published = await this.repository.findPublished(params.slug, params.financialYear);
    if (!published) return null;

    const detailed = aggregate(published.rows, published.accounts, "detailed");
    const legal = aggregate(published.rows, published.accounts, "legal");
    const details = parseResearchFundDetails(published.details);

    return {
      politician: published.politician,
      financialYear: published.financialYear,
      asOfDate: published.asOfDate,
      nextUpdateNote: published.nextUpdateNote,
      policyComment: published.policyComment,
      dataNote: details.dataNote,
      kpi: detailed.kpi,
      unused: detailed.unused,
      sankey: {
        detailed: buildResearchFundSankey(detailed),
        legal: buildResearchFundSankey(legal),
      },
      monthly: buildMonthlyViews(
        detailed.monthly,
        published.financialYear,
        published.publishedThrough,
      ),
      expenses: buildExpenseViews(published.expenses, published.accounts),
      groups: published.groups.map((group) => buildGroupView(group, published.accounts)),
    };
  }
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

function buildGroupView(
  group: PublishedExpenditureGroup,
  accounts: Readonly<Record<string, PublishedAccount>>,
): ResearchFundGroupView {
  // 金額・件数・期間は紐づいた仕訳から自動集計する（admin の編集画面と同じ値になる）。
  const summary = aggregateLinkedEntries(group.entries);
  const categories = new Map<string, ResearchFundCategoryView>();
  for (const entry of group.entries) {
    const account = accounts[entry.accountKey];
    if (!account || categories.has(entry.accountKey)) continue;
    categories.set(entry.accountKey, {
      label: account.label,
      color: researchFundCategoryColor(account.legalCategoryKey),
    });
  }
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    amount: summary.amount,
    count: summary.count,
    period: summary.period,
    categories: [...categories.values()],
    outcomes: group.outcomes,
  };
}
