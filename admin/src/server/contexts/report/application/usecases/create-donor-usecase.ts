import "server-only";

import type { Donor, CreateDonorInput } from "@/server/contexts/report/domain/models/donor";
import { validateDonorInput } from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

interface CreateDonorResult {
  success: boolean;
  donor?: Donor;
  errors?: string[];
}

export class CreateDonorUsecase {
  constructor(private repository: IDonorRepository) {}

  async execute(input: CreateDonorInput): Promise<CreateDonorResult> {
    const trimmedAddress = input.address?.trim() || null;
    const trimmedOccupation = input.occupation?.trim() || null;
    const normalizedInput: CreateDonorInput = {
      donorType: input.donorType,
      name: input.name.trim(),
      address: trimmedAddress,
      occupation: input.donorType === "individual" ? trimmedOccupation : null,
    };

    const validationErrors = validateDonorInput(normalizedInput);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const existing = await this.repository.findByNameAddressAndType(
      normalizedInput.name,
      normalizedInput.address,
      normalizedInput.donorType,
    );
    if (existing) {
      return {
        success: false,
        errors: ["同じ名前・住所・種別の組み合わせが既に存在します"],
      };
    }

    const donor = await this.repository.create(normalizedInput);
    return { success: true, donor };
  }
}
