import "server-only";
import type {
  ResearchFundPoliticianEntry,
  ResearchFundPoliticianSource,
} from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { sortPoliticiansByKana } from "@/server/contexts/research-fund/domain/services/politician-order";
import { buildCoverageLabel } from "@/server/contexts/research-fund/domain/services/research-fund-coverage";

export interface GetResearchFundPoliticiansParams {
  financialYear: number;
}

export class GetResearchFundPoliticiansUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 組織セレクタの「調査研究費」グループに並べる議員。
   * 帳簿があっても published の仕訳が1件も無い議員（入力途中など）は、中身が無いので出さない。
   * 並びはふりがなの五十音順。
   */
  async execute(params: GetResearchFundPoliticiansParams): Promise<ResearchFundPoliticianEntry[]> {
    const politicians = await this.repository.findPoliticians(params.financialYear);
    return sortPoliticiansByKana(
      politicians.filter((source) => source.publishedMonths.length > 0),
    ).map(toEntry);
  }
}

function toEntry(source: ResearchFundPoliticianSource): ResearchFundPoliticianEntry {
  return {
    slug: source.slug,
    name: source.name,
    nameKana: source.nameKana,
    statusLabel: buildCoverageLabel([
      { months: source.publishedMonths, publishedThrough: source.publishedThrough },
    ]),
    hasPhoto: source.hasPhoto,
  };
}
