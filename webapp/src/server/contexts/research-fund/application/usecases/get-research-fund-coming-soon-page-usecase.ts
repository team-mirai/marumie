import "server-only";
import type { ResearchFundComingSoonPage } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { buildResearchFundDataNote } from "@/server/contexts/research-fund/domain/services/research-fund-data-note";
import { buildPoliticianTitle } from "@/server/contexts/research-fund/domain/services/politician-title";

export class GetResearchFundComingSoonPageUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 「準備中」の議員のページに出すプロフィールと添え書き。準備中でない議員（公開中・非公開のまま出さない議員）は null（404）。
   */
  async execute(slug: string): Promise<ResearchFundComingSoonPage | null> {
    const found = await this.repository.findComingSoonProfile(slug);
    if (!found) return null;
    const { house, constituency, ...profile } = found.politician;
    return {
      politician: { ...profile, title: buildPoliticianTitle({ house, constituency }) },
      note: found.note,
      dataNote: buildResearchFundDataNote({ dataNote: null, monthly: [] }),
    };
  }
}
