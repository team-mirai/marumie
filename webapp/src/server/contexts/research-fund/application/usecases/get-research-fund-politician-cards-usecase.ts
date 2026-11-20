import "server-only";
import type { ResearchFundPoliticianCard } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { sortPoliticiansByKana } from "@/server/contexts/research-fund/domain/services/politician-order";
import { buildPoliticianTitle } from "@/server/contexts/research-fund/domain/services/politician-title";

export interface GetResearchFundPoliticianCardsParams {
  financialYear: number;
}

export class GetResearchFundPoliticianCardsUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 議員ページの前後の切り替え・「他の議員の調研費を見る」に並べる議員。
   * 調研費を公開中で、その年度に published の仕訳がある議員（リンク先のページに中身があるもの）をふりがなの五十音順に並べ、
   * その後ろに「準備中」の議員（リンク先は準備中の表示のページ）をふりがなの五十音順に並べる。
   * 調研費を「公開しない」議員は、準備中でない限り repository の段階で外れる。
   */
  async execute(
    params: GetResearchFundPoliticianCardsParams,
  ): Promise<ResearchFundPoliticianCard[]> {
    const [politicians, comingSoon] = await Promise.all([
      this.repository.findPoliticians(params.financialYear),
      this.repository.findComingSoonPoliticians(),
    ]);
    const published = sortPoliticiansByKana(
      politicians.filter((source) => source.publishedMonths.length > 0),
    ).map(
      (source): ResearchFundPoliticianCard => ({
        slug: source.slug,
        name: source.name,
        title: buildPoliticianTitle(source),
        hasPhoto: source.hasPhoto,
        comingSoon: false,
      }),
    );
    const publishedSlugs = new Set(published.map((card) => card.slug));
    return [
      ...published,
      ...sortPoliticiansByKana(comingSoon)
        .filter((politician) => !publishedSlugs.has(politician.slug))
        .map(
          (politician): ResearchFundPoliticianCard => ({
            slug: politician.slug,
            name: politician.name,
            title: null,
            hasPhoto: politician.hasPhoto,
            comingSoon: true,
          }),
        ),
    ];
  }
}
