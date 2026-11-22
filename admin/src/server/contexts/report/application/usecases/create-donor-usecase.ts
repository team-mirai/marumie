import "server-only";

import type { Donor, CreateDonorInput } from "@/server/contexts/report/domain/models/donor";
import {
  duplicateDonorRejectionReason,
  prepareDonorInput,
} from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

interface CreateDonorResult {
  success: boolean;
  donor?: Donor;
  errors?: string[];
}

export class CreateDonorUsecase {
  constructor(private repository: IDonorRepository) {}

  async execute(input: CreateDonorInput): Promise<CreateDonorResult> {
    const prepared = prepareDonorInput(input);
    if (!prepared.success) {
      return { success: false, errors: prepared.errors };
    }

    const candidates = await this.repository.findByMatchCriteriaBatch([prepared.input]);
    const duplicateReason = duplicateDonorRejectionReason(prepared.input, candidates);
    if (duplicateReason) {
      return { success: false, errors: [duplicateReason] };
    }

    const donor = await this.repository.create(prepared.input);
    return { success: true, donor };
  }
}
