import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/**
 * 調研費を非公開のまま、webapp の議員一覧（トップ・メニュー・フッター・「他の議員」）に「準備中」として出すかと、その添え書きを設定する。
 * note が null なら出さない。準備中にできるか・添え書きの形は Politician が決める。
 * 設定したら webapp のキャッシュを消す。保存自体は確定しているので、キャッシュ無効化の失敗は警告として返す。
 */
export class SetPoliticianResearchFundComingSoonUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string, note: string | null) {
    const politician = Politician.isValidId(id) ? await this.repository.findById(id) : null;
    if (!politician) throw new Error("議員が見つかりません");
    const result = Politician.setResearchFundComingSoonNote(politician, note);
    if (result.status === "invalid") throw new Error(result.errors[0].message);
    await this.repository.setResearchFundComingSoonNote(id, result.value);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
