import "server-only";
import type { PublishedResearchFundPageRef } from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

export class GetPublishedResearchFundPagesUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /** sitemap に載せる議員ページ（/p/[slug]/[year]）の一覧。 */
  async execute(): Promise<PublishedResearchFundPageRef[]> {
    return await this.repository.findPublishedPageRefs();
  }
}
