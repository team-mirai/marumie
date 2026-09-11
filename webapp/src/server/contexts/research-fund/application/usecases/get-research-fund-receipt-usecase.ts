import "server-only";
import type { ReceiptStorage } from "@/server/contexts/research-fund/domain/repositories/receipt-storage.interface";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

/** 署名URLの有効期限（秒）。開いてすぐ表示する用途なので短くする。 */
const SIGNED_URL_EXPIRES_IN = 300;

export class GetResearchFundReceiptUsecase {
  constructor(
    private repository: ResearchFundRepository,
    private storage: ReceiptStorage,
  ) {}

  /**
   * published の仕訳に紐づく領収書の署名URL。
   * 未公開の仕訳・存在しない仕訳は null を返し、公開前の領収書が漏れないようにする。
   */
  async execute(entryId: string): Promise<string | null> {
    if (!/^[1-9]\d*$/.test(entryId)) return null;
    const receipt = await this.repository.findPublishedReceipt(entryId);
    if (!receipt) return null;
    return await this.storage.createSignedUrl(receipt.storageKey, SIGNED_URL_EXPIRES_IN);
  }
}
