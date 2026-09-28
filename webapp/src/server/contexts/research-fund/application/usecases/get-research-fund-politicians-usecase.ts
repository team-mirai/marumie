import "server-only";
import type {
  ResearchFundPoliticianEntry,
  ResearchFundPoliticianSource,
} from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { buildCoverageLabel } from "@/server/contexts/research-fund/domain/services/research-fund-coverage";

export interface GetResearchFundPoliticiansParams {
  financialYear: number;
}

export class GetResearchFundPoliticiansUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 組織セレクタの「調査研究費」グループに並べる議員。
   * 帳簿があっても published の仕訳が1件も無い議員（入力途中など）は、中身が無いので出さない。
   */
  async execute(params: GetResearchFundPoliticiansParams): Promise<ResearchFundPoliticianEntry[]> {
    const politicians = await this.repository.findPoliticians(params.financialYear);
    return politicians.filter((source) => source.publishedMonths.length > 0).map(toEntry);
  }
}

function toEntry(source: ResearchFundPoliticianSource): ResearchFundPoliticianEntry {
  return {
    slug: source.slug,
    name: source.name,
    statusLabel: buildCoverageLabel([
      { months: source.publishedMonths, publishedThrough: source.publishedThrough },
    ]),
  };
}
