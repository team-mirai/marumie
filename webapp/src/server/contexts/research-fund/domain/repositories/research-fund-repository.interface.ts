import type {
  PublishedReceipt,
  PublishedResearchFund,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";

export interface ResearchFundRepository {
  /** 議員の slug と年度から、published の仕訳だけを射影して返す。帳簿が無ければ null */
  findPublished(slug: string, financialYear: number): Promise<PublishedResearchFund | null>;

  /** published の仕訳に紐づく領収書だけを返す。未公開の仕訳の領収書は返さない。 */
  findPublishedReceipt(entryId: string): Promise<PublishedReceipt | null>;
}
