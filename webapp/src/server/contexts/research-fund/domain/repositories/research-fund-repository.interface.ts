import type {
  PublishedPartyResearchFund,
  PublishedReceipt,
  PublishedResearchFund,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundPoliticianSource } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";

export interface ResearchFundRepository {
  /** 議員の slug と年度から、published の仕訳だけを射影して返す。帳簿が無ければ null */
  findPublished(slug: string, financialYear: number): Promise<PublishedResearchFund | null>;

  /**
   * 政治団体の slug と年度から、所属議員（ended_on が NULL の membership）全員分を射影して返す。
   * 所属議員がいなければ null（政党ページは A-6 を出さない）。
   */
  findPublishedByOrganization(
    slug: string,
    financialYear: number,
  ): Promise<PublishedPartyResearchFund | null>;

  /**
   * 組織セレクタに出す議員の一覧。その年度の帳簿を持つ議員だけを当選期順で返す。
   * 公開状況（ready / statusLabel）の判定は usecase が行う。
   */
  findPoliticians(financialYear: number): Promise<ResearchFundPoliticianSource[]>;

  /** published の仕訳に紐づく領収書だけを返す。未公開の仕訳の領収書は返さない。 */
  findPublishedReceipt(entryId: string): Promise<PublishedReceipt | null>;
}
