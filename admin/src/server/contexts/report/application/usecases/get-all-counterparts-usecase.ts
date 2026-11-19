import "server-only";

import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface GetAllCounterpartsInput {
  limit?: number;
}

export class GetAllCounterpartsUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(input: GetAllCounterpartsInput = {}): Promise<Counterpart[]> {
    const limit = input.limit ?? 1000;
    return this.repository.findAll({ limit });
  }
}
