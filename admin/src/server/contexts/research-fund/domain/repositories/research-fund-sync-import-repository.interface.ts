import type { ResearchFundSyncExport } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type {
  ResearchFundSyncDeletingCounts,
  ResearchFundSyncImportResultPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";

/** 取り込み先（この環境）にすでにいる議員。ファイルの slug で引く。 */
export interface ResearchFundSyncTargetPolitician {
  id: string;
  slug: string;
  name: string;
}

export interface IResearchFundSyncImportRepository {
  /** ファイルの議員 slug のうち、この環境にいる議員を返す。 */
  findPoliticiansBySlugs(slugs: string[]): Promise<ResearchFundSyncTargetPolitician[]>;

  /** 置き換えで消える、この環境の議員室の調研費データの件数（dry-run 用）。 */
  countPoliticianData(politicianId: string): Promise<ResearchFundSyncDeletingCounts>;

  /** 渡した政治団体 slug のうち、この環境にあるものだけを返す。 */
  findExistingOrganizationSlugs(slugs: string[]): Promise<string[]>;

  /** 渡した科目キーのうち、この環境の科目マスタにあるものだけを返す。 */
  findExistingAccountKeys(keys: string[]): Promise<string[]>;

  /** 渡した法定区分キーのうち、この環境の科目マスタにあるものだけを返す。 */
  findExistingLegalCategoryKeys(keys: string[]): Promise<string[]>;

  /**
   * ファイルに入っている議員室ごとに、調研費データ（書類・スキャン履歴を含む）を消してファイルの内容で入れ直す。
   * 同じ slug の議員がいなければファイルのプロフィールで作る。ファイルに無い議員室には触れない。
   * 全体を 1 つの DB トランザクションで行い、途中で失敗したらどの議員室も変わらないこと。
   */
  replaceResearchFundSyncData(
    file: ResearchFundSyncExport,
  ): Promise<ResearchFundSyncImportResultPolitician[]>;
}
