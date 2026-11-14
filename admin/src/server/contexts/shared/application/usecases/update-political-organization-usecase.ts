import "server-only";

import {
  type PoliticalOrganization,
  PoliticalOrganizationLinks,
} from "@/shared/models/political-organization";
import type {
  IPoliticalOrganizationRepository,
  UpdatePoliticalOrganizationInput,
} from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
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
    data: UpdatePoliticalOrganizationInput,
  ): Promise<{ organization: PoliticalOrganization; cacheWarning: string | null }> {
    // 入力の誤りはそのままのメッセージで返す
    if (!data.displayName || data.displayName.trim().length === 0) {
      throw new PoliticalOrganizationInputError("表示名は必須です");
    }

    if (!data.slug || data.slug.trim().length === 0) {
      throw new PoliticalOrganizationInputError("スラッグは必須です");
    }

    const links = this.normalizeLinks(data);

    let organization: PoliticalOrganization;
    try {
      organization = await this.repository.update(id, { ...data, ...links });
    } catch (error) {
      throw new Error(
        `Failed to update political organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
    return { organization, cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }

  /** 公式サイト・SNS はそれぞれ渡されたときだけ検証して保存する（省略した項目は今の値のまま） */
  private normalizeLinks(data: UpdatePoliticalOrganizationInput) {
    const { websiteUrl, snsUrls } = data;
    if (
      (websiteUrl !== undefined && typeof websiteUrl !== "string") ||
      (snsUrls !== undefined &&
        (!Array.isArray(snsUrls) || snsUrls.some((url) => typeof url !== "string")))
    ) {
      throw new PoliticalOrganizationInputError("公式サイト・SNS の入力内容を確認してください");
    }
    const links = PoliticalOrganizationLinks.normalize({
      websiteUrl: websiteUrl ?? "",
      snsUrls: snsUrls ?? [],
    });
    const error = PoliticalOrganizationLinks.validate(links);
    if (error) throw new PoliticalOrganizationInputError(error);
    return {
      ...(websiteUrl !== undefined && { websiteUrl: links.websiteUrl }),
      ...(snsUrls !== undefined && { snsUrls: links.snsUrls }),
    };
  }
}
