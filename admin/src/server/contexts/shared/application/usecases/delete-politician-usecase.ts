import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

export class DeletePoliticianUsecase {
  constructor(private repository: IPoliticianRepository) {}

  async execute(id: string) {
    if (!Politician.isValidId(id) || !(await this.repository.findById(id)))
      throw new Error("議員が見つかりません");
    await this.repository.delete(id);
  }
}
