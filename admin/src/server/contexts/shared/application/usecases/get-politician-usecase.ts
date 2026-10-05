import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

export class GetPoliticianUsecase {
  constructor(private repository: IPoliticianRepository) {}

  execute(id: string) {
    if (!Politician.isValidId(id)) return Promise.resolve(null);
    return this.repository.findById(id);
  }
}
