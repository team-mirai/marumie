import "server-only";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";
import { buildResearchFundCsv } from "@/server/contexts/research-fund/domain/services/research-fund-csv";

export interface GetResearchFundCsvParams {
  slug: string;
  financialYear: number;
}

export class GetResearchFundCsvUsecase {
  constructor(private repository: ResearchFundRepository) {}

  /**
   * 議員ページの全支出 CSV の中身。帳簿が無ければ null を返し、呼び出し側が 404 にする。
   * ファイル名はダウンロード時刻に依るのでここでは組み立てない（キャッシュに載せない）。
   */
  async execute(params: GetResearchFundCsvParams): Promise<string | null> {
    const published = await this.repository.findPublished(params.slug, params.financialYear);
    if (!published) return null;
    return buildResearchFundCsv(published);
  }
}
