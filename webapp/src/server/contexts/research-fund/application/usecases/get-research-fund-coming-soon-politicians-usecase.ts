import "server-only";
import type { ResearchFundComingSoonPolitician } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { sortPoliticiansByKana } from "@/server/contexts/research-fund/domain/models/politician-order";

export class GetResearchFundComingSoonPoliticiansUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 調研費を非公開のまま「準備中」としてグレーで出す議員（ふりがなの五十音順）。
   * 公開中の議員の後ろに並べるのは呼び出し側（トップ・メニュー・フッター・「他の議員」）が行う。
   */
  async execute(): Promise<ResearchFundComingSoonPolitician[]> {
    return sortPoliticiansByKana(await this.repository.findComingSoonPoliticians());
  }
}
