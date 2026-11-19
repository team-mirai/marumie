import "server-only";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

export class ListPoliticiansUsecase {
  constructor(private repository: IPoliticianRepository) {}

  execute() {
    return this.repository.findAll();
  }
}
