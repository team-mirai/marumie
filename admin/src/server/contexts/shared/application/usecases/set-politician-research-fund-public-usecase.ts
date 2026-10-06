import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/**
 * 議員ごとに調研費を「公開する／公開しない」を切り替える。
 * webapp の導線・sitemap・noindex に時間を置かず反映されるよう、切り替えたら webapp のキャッシュを消す。
 * 保存自体は確定しているので、キャッシュ無効化の失敗は失敗にせず警告として返す。
 */
export class SetPoliticianResearchFundPublicUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string, isPublic: boolean) {
    if (typeof isPublic !== "boolean") throw new Error("公開するかを選択してください");
    if (!Politician.isValidId(id) || !(await this.repository.findById(id)))
      throw new Error("議員が見つかりません");
    await this.repository.setResearchFundPublic(id, isPublic);
    return { cacheWarning: await this.invalidateWebappCache() };
  }

  private async invalidateWebappCache(): Promise<string | null> {
    try {
      await this.cacheInvalidator.invalidateWebappCache();
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "ウェブアプリのキャッシュを更新できませんでした";
    }
  }
}
