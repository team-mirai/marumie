import "server-only";

import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import type {
  CounterpartFilters,
  ICounterpartRepository,
} from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface GetCounterpartsInput {
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

interface GetCounterpartsResult {
  counterparts: CounterpartWithUsage[];
  total: number;
}

export class GetCounterpartsUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(input: GetCounterpartsInput): Promise<GetCounterpartsResult> {
    const filters: CounterpartFilters = {
      searchQuery: input.searchQuery,
      limit: input.limit,
      offset: input.offset,
    };

    const [counterparts, total] = await Promise.all([
      this.repository.findAllWithUsage(filters),
      this.repository.count(filters),
    ]);

    return { counterparts, total };
  }
}
