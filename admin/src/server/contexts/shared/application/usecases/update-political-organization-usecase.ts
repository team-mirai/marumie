import "server-only";

import {
  type PoliticalOrganization,
  PoliticalOrganizationInput,
} from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
import { PoliticalOrganizationInputError } from "@/server/contexts/shared/domain/errors/political-organization-input-error";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/**
 * 政治団体の情報（表示名・公式サイト・SNS など）を更新する。
 * webapp の政治団体ページに時間を置かず反映されるよう、保存したら webapp のキャッシュを消す（失敗は警告として返す）。
 */
export class UpdatePoliticalOrganizationUsecase {
  constructor(
    private repository: IPoliticalOrganizationRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(
    id: bigint,
    data: PoliticalOrganizationInput,
  ): Promise<{ organization: PoliticalOrganization; cacheWarning: string | null }> {
    // 入力の誤りはそのままのメッセージで返す
    const { websiteUrl, snsUrls } = data;
    if (
      (websiteUrl !== undefined && typeof websiteUrl !== "string") ||
      (snsUrls !== undefined &&
        (!Array.isArray(snsUrls) || snsUrls.some((url) => typeof url !== "string")))
    ) {
      throw new PoliticalOrganizationInputError("公式サイト・SNS の入力内容を確認してください");
    }
    // 公式サイト・SNS はそれぞれ渡されたときだけ検証して保存する（省略した項目は今の値のまま）
    const input = PoliticalOrganizationInput.normalize(data);
    const error = PoliticalOrganizationInput.validate(input);
    if (error) throw new PoliticalOrganizationInputError(error);

    let organization: PoliticalOrganization;
    try {
      organization = await this.repository.update(id, input);
    } catch (error) {
      throw new Error(
        `Failed to update political organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
    return { organization, cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
