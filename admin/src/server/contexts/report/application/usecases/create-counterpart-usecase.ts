import "server-only";

import {
  type Counterpart,
  type CreateCounterpartInput,
  CounterpartInput,
  CounterpartUniqueness,
} from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface CreateCounterpartResult {
  success: boolean;
  counterpart?: Counterpart;
  errors?: string[];
}

export class CreateCounterpartUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(input: CreateCounterpartInput): Promise<CreateCounterpartResult> {
    const normalizedInput = CounterpartInput.normalize(input);

    const validationErrors = CounterpartInput.validate(normalizedInput);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const sameNameAndAddress = await this.repository.findByNameAndAddress(
      normalizedInput.name,
      normalizedInput.address,
    );
    const duplicateReason = CounterpartUniqueness.rejectionReason(sameNameAndAddress);
    if (duplicateReason) {
      return { success: false, errors: [duplicateReason] };
    }

    const counterpart = await this.repository.create(normalizedInput);
    return { success: true, counterpart };
  }
}
