import "server-only";

import type { DonorWithUsage, DonorType } from "@/server/contexts/report/domain/models/donor";
import type {
  DonorFilters,
  IDonorRepository,
} from "@/server/contexts/report/domain/repositories/donor-repository.interface";

interface GetDonorsInput {
  searchQuery?: string;
  donorType?: DonorType;
  limit?: number;
  offset?: number;
}

interface GetDonorsResult {
  donors: DonorWithUsage[];
  total: number;
}

export class GetDonorsUsecase {
  constructor(private repository: IDonorRepository) {}

  async execute(input: GetDonorsInput): Promise<GetDonorsResult> {
    const filters: DonorFilters = {
      searchQuery: input.searchQuery,
      donorType: input.donorType,
      limit: input.limit,
      offset: input.offset,
    };

    const [donors, total] = await Promise.all([
      this.repository.findAllWithUsage(filters),
      this.repository.count(filters),
    ]);

    return { donors, total };
  }
}
