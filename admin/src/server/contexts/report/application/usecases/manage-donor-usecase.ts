import "server-only";

import type {
  Donor,
  DonorWithUsage,
  DonorType,
  CreateDonorInput,
  UpdateDonorInput,
} from "@/server/contexts/report/domain/models/donor";
import { validateDonorInput } from "@/server/contexts/report/domain/models/donor";
import type {
  DonorFilters,
  IDonorRepository,
} from "@/server/contexts/report/domain/repositories/donor-repository.interface";

export interface GetDonorsInput {
  searchQuery?: string;
  donorType?: DonorType;
  limit?: number;
  offset?: number;
}

export interface GetDonorsResult {
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

export interface CreateDonorResult {
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

export interface UpdateDonorResult {
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

export interface DeleteDonorResult {
  success: boolean;
  errors?: string[];
}

export class DeleteDonorUsecase {
  constructor(
    private repository: IDonorRepository,
    private checkUsage = true,
  ) {}

  async execute(id: string): Promise<DeleteDonorResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["寄付者が見つかりません"] };
    }

    if (this.checkUsage) {
      const usageCount = await this.repository.getUsageCount(id);
      if (usageCount > 0) {
        return {
          success: false,
          errors: [
            `この寄付者は${usageCount}件のトランザクションで使用されています。削除するには先に関連するトランザクションを削除してください。`,
          ],
        };
      }
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
