import "server-only";
import { Politician, type PoliticianInput } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

export class SavePoliticianUsecase {
  constructor(private repository: IPoliticianRepository) {}

  async execute(id: string | null, input: PoliticianInput) {
    const normalized = Politician.normalize(input);
    const validation = Politician.validate(normalized);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);
    if (id !== null) await this.ensureExists(id);
    await this.repository.save(id, normalized);
  }

  private async ensureExists(id: string) {
    if (!Politician.isValidId(id) || !(await this.repository.findById(id)))
      throw new Error("議員が見つかりません");
  }
}
