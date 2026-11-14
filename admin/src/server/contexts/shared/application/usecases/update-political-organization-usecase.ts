import "server-only";

import {
  type PoliticalOrganization,
  PoliticalOrganizationLinks,
} from "@/shared/models/political-organization";
import type {
  IPoliticalOrganizationRepository,
  UpdatePoliticalOrganizationInput,
} from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class UpdatePoliticalOrganizationUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(
    id: bigint,
    data: UpdatePoliticalOrganizationInput,
  ): Promise<PoliticalOrganization> {
    // 入力の誤りはそのままのメッセージで返す
    if (!data.displayName || data.displayName.trim().length === 0) {
      throw new Error("表示名は必須です");
    }

    if (!data.slug || data.slug.trim().length === 0) {
      throw new Error("スラッグは必須です");
    }

    const links = this.normalizeLinks(data);

    try {
      return await this.repository.update(id, { ...data, ...links });
    } catch (error) {
      throw new Error(
        `Failed to update political organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /** 公式サイト・SNS は渡されたときだけ検証して保存する（省略時は今の値のまま） */
  private normalizeLinks(data: UpdatePoliticalOrganizationInput) {
    if (data.websiteUrl === undefined && data.snsUrls === undefined) return {};
    if (
      typeof data.websiteUrl !== "string" ||
      !Array.isArray(data.snsUrls) ||
      data.snsUrls.some((url) => typeof url !== "string")
    ) {
      throw new Error("公式サイト・SNS の入力内容を確認してください");
    }
    const links = PoliticalOrganizationLinks.normalize({
      websiteUrl: data.websiteUrl,
      snsUrls: data.snsUrls,
    });
    const error = PoliticalOrganizationLinks.validate(links);
    if (error) throw new Error(error);
    return links;
  }
}
