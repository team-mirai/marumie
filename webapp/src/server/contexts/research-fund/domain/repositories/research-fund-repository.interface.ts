import type {
  PublishedPoliticianResearchFund,
  PublishedReceipt,
  PublishedResearchFund,
  PublishedResearchFundPageRef,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundPoliticianSource } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";

export interface ResearchFundRepository {
  /** 議員の slug と年度から、published の仕訳だけを射影して返す。帳簿が無ければ null */
  findPublished(slug: string, financialYear: number): Promise<PublishedResearchFund | null>;

  /**
   * トップページの「所属議員の調研費」に並べる議員を、表示順（display_order）で射影して返す。
   * 調研費を公開中で、その年度に published の仕訳がある議員全員。政治団体への所属は問わない。
   */
  findPublishedForHome(financialYear: number): Promise<PublishedPoliticianResearchFund[]>;

  /**
   * 組織セレクタに出す議員の一覧。その年度の帳簿を持つ議員だけを当選期順で返す。
   * 公開状況（ready / statusLabel）の判定は usecase が行う。
   */
  findPoliticians(financialYear: number): Promise<ResearchFundPoliticianSource[]>;

  /** 公開ページが成立する議員×年度の一覧（sitemap 用）。published の仕訳を 1 件以上持つ帳簿だけ */
  findPublishedPageRefs(): Promise<PublishedResearchFundPageRef[]>;

  /** published の仕訳に紐づく領収書の、作成済みの公開用の版だけを返す。未公開の仕訳の領収書・原本は返さない。 */
  findPublishedReceipt(entryId: string): Promise<PublishedReceipt | null>;
}
