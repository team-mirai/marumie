import "server-only";

import type {
  Counterpart,
  CreateCounterpartInput,
} from "@/server/contexts/report/domain/models/counterpart";
import { validateCounterpartInput } from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface CreateCounterpartResult {
  success: boolean;
  counterpart?: Counterpart;
  errors?: string[];
}

export class CreateCounterpartUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(input: CreateCounterpartInput): Promise<CreateCounterpartResult> {
    const trimmedAddress = input.address?.trim() || null;
    const trimmedPostalCode = input.postalCode?.trim() || null;
    const normalizedInput = {
      name: input.name.trim(),
      postalCode: trimmedPostalCode,
      address: trimmedAddress,
    };

    const validationErrors = validateCounterpartInput(normalizedInput);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const existing = await this.repository.findByNameAndAddress(
      normalizedInput.name,
      normalizedInput.address,
    );
    if (existing) {
      return {
        success: false,
        errors: ["同じ名前・住所の組み合わせが既に存在します"],
      };
    }

    const counterpart = await this.repository.create(normalizedInput);
    return { success: true, counterpart };
  }
}
