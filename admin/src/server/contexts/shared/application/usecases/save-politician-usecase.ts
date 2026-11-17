import "server-only";
import { Politician, type PoliticianInput } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/** 議員を作成・更新する。公開サイトの議員カード・議員ページに出るので、保存したら webapp のキャッシュを消す */
export class SavePoliticianUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string | null, input: PoliticianInput) {
    const normalized = Politician.normalize(input);
    const validation = Politician.validate(normalized);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);
    if (id !== null) await this.ensureExists(id);
    await this.repository.save(id, normalized);
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }

  private async ensureExists(id: string) {
    if (!Politician.isValidId(id) || !(await this.repository.findById(id)))
      throw new Error("議員が見つかりません");
  }
}
