import "server-only";

import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

export class GetCounterpartUsageUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string): Promise<number> {
    return this.repository.getUsageCount(id);
  }
}
