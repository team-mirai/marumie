import type {
  PublishedReceipt,
  PublishedResearchFund,
  PublishedResearchFundPageRef,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";

export interface ResearchFundRepository {
  /** 議員の slug と年度から、published の仕訳だけを射影して返す。帳簿が無ければ null */
  findPublished(slug: string, financialYear: number): Promise<PublishedResearchFund | null>;

  /** 公開ページが成立する議員×年度の一覧（sitemap 用）。published の仕訳を 1 件以上持つ帳簿だけ */
  findPublishedPageRefs(): Promise<PublishedResearchFundPageRef[]>;

  /** published の仕訳に紐づく領収書だけを返す。未公開の仕訳の領収書は返さない。 */
  findPublishedReceipt(entryId: string): Promise<PublishedReceipt | null>;
}
