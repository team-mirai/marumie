import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/** 添え書きの上限。一覧の点線の枠に1〜2行で収まる長さにする */
const NOTE_MAX_LENGTH = 200;

/**
 * 調研費を非公開のまま、webapp の議員一覧（トップ・メニュー・フッター・「他の議員」）に「準備中」としてグレーで出すかを切り替える。
 * note が null なら出さない。文字列なら前後の空白を除いて保存する（空文字 = 添え書きなしで出す）。
 * 公開中の議員には出さない（webapp 側で非公開の議員だけを拾う）ので、公開中でも保存はできる。
 * 切り替えたら webapp のキャッシュを消す。保存自体は確定しているので、キャッシュ無効化の失敗は警告として返す。
 */
export class SetPoliticianResearchFundComingSoonUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string, note: string | null) {
    if (note !== null && typeof note !== "string")
      throw new Error("添え書きの形式が正しくありません");
    const normalized = note === null ? null : note.trim();
    if (normalized !== null && normalized.length > NOTE_MAX_LENGTH)
      throw new Error(`添え書きは${NOTE_MAX_LENGTH}文字以内で入力してください`);
    if (!Politician.isValidId(id) || !(await this.repository.findById(id)))
      throw new Error("議員が見つかりません");
    await this.repository.setResearchFundComingSoonNote(id, normalized);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
