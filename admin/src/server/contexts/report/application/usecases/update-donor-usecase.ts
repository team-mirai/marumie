import "server-only";

import type { Donor, UpdateDonorInput } from "@/server/contexts/report/domain/models/donor";
import { validateDonorInput } from "@/server/contexts/report/domain/models/donor";
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

    const newDonorType = input.donorType ?? existing.donorType;
    const newName = input.name?.trim() ?? existing.name;
    const newAddress =
      input.address === undefined ? existing.address : input.address?.trim() || null;
    const newOccupation =
      newDonorType === "individual"
        ? input.occupation === undefined
          ? existing.occupation
          : input.occupation?.trim() || null
        : null;

    const validationErrors = validateDonorInput({
      donorType: newDonorType,
      name: newName,
      address: newAddress,
      occupation: newOccupation,
    });
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    if (
      newName !== existing.name ||
      newAddress !== existing.address ||
      newDonorType !== existing.donorType
    ) {
      const duplicate = await this.repository.findByNameAddressAndType(
        newName,
        newAddress,
        newDonorType,
      );
      if (duplicate && duplicate.id !== id) {
        return {
          success: false,
          errors: ["同じ名前・住所・種別の組み合わせが既に存在します"],
        };
      }
    }

    const donor = await this.repository.update(id, {
      donorType: newDonorType,
      name: newName,
      address: newAddress,
      occupation: newOccupation,
    });
    return { success: true, donor };
  }
}
