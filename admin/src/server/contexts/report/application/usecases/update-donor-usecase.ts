import "server-only";

import type { Donor, UpdateDonorInput } from "@/server/contexts/report/domain/models/donor";
import {
  duplicateDonorRejectionReason,
  prepareDonorInput,
} from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

interface UpdateDonorResult {
  success: boolean;
  donor?: Donor;
  errors?: string[];
}

export class UpdateDonorUsecase {
  constructor(private repository: IDonorRepository) {}

  async execute(id: string, input: UpdateDonorInput): Promise<UpdateDonorResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["寄付者が見つかりません"] };
    }

    const prepared = prepareDonorInput({
      donorType: input.donorType ?? existing.donorType,
      name: input.name ?? existing.name,
      address: input.address === undefined ? existing.address : input.address,
      occupation: input.occupation === undefined ? existing.occupation : input.occupation,
    });
    if (!prepared.success) {
      return { success: false, errors: prepared.errors };
    }

    const candidates = await this.repository.findByMatchCriteriaBatch([prepared.input]);
    const duplicateReason = duplicateDonorRejectionReason(prepared.input, candidates, existing);
    if (duplicateReason) {
      return { success: false, errors: [duplicateReason] };
    }

    const donor = await this.repository.update(id, prepared.input);
    return { success: true, donor };
  }
}
