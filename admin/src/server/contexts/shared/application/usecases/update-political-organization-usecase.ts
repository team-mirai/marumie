import "server-only";

import type { PoliticalOrganization } from "@/shared/models/political-organization";
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
    try {
      if (!data.displayName || data.displayName.trim().length === 0) {
        throw new Error("表示名は必須です");
      }

      if (!data.slug || data.slug.trim().length === 0) {
        throw new Error("スラッグは必須です");
      }

      return await this.repository.update(id, data);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "表示名は必須です" || error.message === "スラッグは必須です")
      ) {
        throw error;
      }
      throw new Error(
        `Failed to update political organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
