import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/**
 * 議員ごとに調研費を「公開する／公開しない」を切り替える。公開すると「準備中」の添え書きも消える（Politician が決める）。
 * webapp の導線・sitemap・noindex に時間を置かず反映されるよう、切り替えたら webapp のキャッシュを消す。
 * 保存自体は確定しているので、キャッシュ無効化の失敗は失敗にせず警告として返す。
 */
export class SetPoliticianResearchFundPublicUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string, isPublic: boolean) {
    const politician = Politician.isValidId(id) ? await this.repository.findById(id) : null;
    if (!politician) throw new Error("議員が見つかりません");
    const result = Politician.setResearchFundPublic(politician, isPublic);
    if (result.status === "invalid") throw new Error(result.errors[0].message);
    await this.repository.setResearchFundPublic(id, result.value);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
