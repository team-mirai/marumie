import "server-only";

import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import { GetAllCounterpartsUsecase } from "@/server/contexts/report/application/usecases/get-all-counterparts-usecase";

interface GetCounterpartDetailResult {
  counterpart: Counterpart | null;
  usageCount: number;
  allCounterparts: Counterpart[];
}

export class GetCounterpartDetailUsecase {
  private getAllCounterpartsUsecase: GetAllCounterpartsUsecase;

  constructor(private repository: ICounterpartRepository) {
    this.getAllCounterpartsUsecase = new GetAllCounterpartsUsecase(repository);
  }

  async execute(id: string): Promise<GetCounterpartDetailResult> {
    const [counterpart, usageCount, allCounterparts] = await Promise.all([
      this.repository.findById(id),
      this.repository.getUsageCount(id),
      this.getAllCounterpartsUsecase.execute(),
    ]);

    return { counterpart, usageCount, allCounterparts };
  }
}
