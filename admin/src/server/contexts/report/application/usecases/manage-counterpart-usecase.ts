import "server-only";

import type {
  Counterpart,
  CounterpartWithUsage,
  CreateCounterpartInput,
  UpdateCounterpartInput,
} from "@/server/contexts/report/domain/models/counterpart";
import { validateCounterpartInput } from "@/server/contexts/report/domain/models/counterpart";
import type {
  CounterpartFilters,
  ICounterpartRepository,
} from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

export interface GetCounterpartsInput {
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface GetCounterpartsResult {
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

export class GetCounterpartByIdUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string): Promise<Counterpart | null> {
    return this.repository.findById(id);
  }
}

export interface CreateCounterpartResult {
  success: boolean;
  counterpart?: Counterpart;
  errors?: string[];
}

export class CreateCounterpartUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(input: CreateCounterpartInput): Promise<CreateCounterpartResult> {
    const validationErrors = validateCounterpartInput(input);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const existing = await this.repository.findByNameAndAddress(
      input.name.trim(),
      input.address.trim(),
    );
    if (existing) {
      return {
        success: false,
        errors: ["同じ名前・住所の組み合わせが既に存在します"],
      };
    }

    const counterpart = await this.repository.create(input);
    return { success: true, counterpart };
  }
}

export interface UpdateCounterpartResult {
  success: boolean;
  counterpart?: Counterpart;
  errors?: string[];
}

export class UpdateCounterpartUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string, input: UpdateCounterpartInput): Promise<UpdateCounterpartResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["取引先が見つかりません"] };
    }

    const newName = input.name?.trim() ?? existing.name;
    const newAddress = input.address?.trim() ?? existing.address;

    const validationErrors = validateCounterpartInput({
      name: newName,
      address: newAddress,
    });
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    if (newName !== existing.name || newAddress !== existing.address) {
      const duplicate = await this.repository.findByNameAndAddress(newName, newAddress);
      if (duplicate && duplicate.id !== id) {
        return {
          success: false,
          errors: ["同じ名前・住所の組み合わせが既に存在します"],
        };
      }
    }

    const counterpart = await this.repository.update(id, {
      name: newName,
      address: newAddress,
    });
    return { success: true, counterpart };
  }
}

export interface DeleteCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class DeleteCounterpartUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string): Promise<DeleteCounterpartResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["取引先が見つかりません"] };
    }

    await this.repository.delete(id);
    return { success: true };
  }
}

export class GetCounterpartUsageUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string): Promise<number> {
    return this.repository.getUsageCount(id);
  }
}
