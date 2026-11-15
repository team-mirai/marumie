import "server-only";
import type { ResearchFundPoliticianCard } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { buildPoliticianTitle } from "@/server/contexts/research-fund/domain/services/politician-title";

export interface GetResearchFundPoliticianCardsParams {
  financialYear: number;
}

export class GetResearchFundPoliticianCardsUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 議員ページの前後の切り替え・「ほかの議員の調研費」に並べる議員（表示順）。
   * 調研費を公開中で、その年度に published の仕訳がある議員だけ（リンク先のページに中身があるもの）。
   * 調研費を「公開しない」議員は repository の段階で外れる。
   */
  async execute(
    params: GetResearchFundPoliticianCardsParams,
  ): Promise<ResearchFundPoliticianCard[]> {
    const politicians = await this.repository.findPoliticians(params.financialYear);
    return politicians
      .filter((source) => source.publishedMonths.length > 0)
      .map((source) => ({
        slug: source.slug,
        name: source.name,
        title: buildPoliticianTitle(source),
        hasPhoto: source.hasPhoto,
      }));
  }
}
