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

  /** 組織セレクタの「調査研究費」グループに並べる議員。準備中の議員も隠さない。 */
  async execute(params: GetResearchFundPoliticiansParams): Promise<ResearchFundPoliticianEntry[]> {
    const politicians = await this.repository.findPoliticians(params.financialYear);
    return politicians.map(toEntry);
  }
}

/** published の仕訳が1件も無い議員は「準備中」。行は隠さずグレーで残す。 */
function toEntry(source: ResearchFundPoliticianSource): ResearchFundPoliticianEntry {
  const ready = source.publishedMonths.length > 0;
  return {
    slug: source.slug,
    name: source.name,
    ready,
    statusLabel: ready
      ? buildCoverageLabel([
          { months: source.publishedMonths, publishedThrough: source.publishedThrough },
        ])
      : "準備中",
  };
}
