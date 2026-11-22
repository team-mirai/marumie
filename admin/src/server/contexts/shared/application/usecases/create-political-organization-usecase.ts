import {
  type PoliticalOrganization,
  PoliticalOrganizationInput,
} from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
import { PoliticalOrganizationInputError } from "@/server/contexts/shared/domain/errors/political-organization-input-error";

export class CreatePoliticalOrganizationUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(
    displayName: string,
    slug: string,
    orgName?: string,
    description?: string,
  ): Promise<PoliticalOrganization> {
    // 入力の誤りはそのままのメッセージで返す
    const input = PoliticalOrganizationInput.normalize({ displayName, slug, orgName, description });
    const error = PoliticalOrganizationInput.validate(input);
    if (error) throw new PoliticalOrganizationInputError(error);

    try {
      return await this.repository.create(input);
    } catch (error) {
      throw new Error(
        `Failed to create organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
