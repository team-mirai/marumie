import "server-only";

import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

export class GetCounterpartByIdUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string): Promise<Counterpart | null> {
    return this.repository.findById(id);
  }
}
