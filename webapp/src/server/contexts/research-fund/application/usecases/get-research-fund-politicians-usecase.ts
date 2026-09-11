import "server-only";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

export interface GetResearchFundPoliticiansParams {
  financialYear: number;
}

export class GetResearchFundPoliticiansUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /** 組織セレクタの「調査研究費」グループに並べる議員。準備中の議員も隠さない。 */
  async execute(params: GetResearchFundPoliticiansParams): Promise<ResearchFundPoliticianEntry[]> {
    return await this.repository.findPoliticians(params.financialYear);
  }
}
