import "server-only";

import {
  type Counterpart,
  type UpdateCounterpartInput,
  CounterpartInput,
  CounterpartUniqueness,
} from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface UpdateCounterpartResult {
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

    const normalizedInput = CounterpartInput.normalizeUpdate(existing, input);

    const validationErrors = CounterpartInput.validate(normalizedInput);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const sameNameAndAddress = await this.repository.findByNameAndAddress(
      normalizedInput.name,
      normalizedInput.address,
    );
    const duplicateReason = CounterpartUniqueness.rejectionReason(sameNameAndAddress, id);
    if (duplicateReason) {
      return { success: false, errors: [duplicateReason] };
    }

    const counterpart = await this.repository.update(id, normalizedInput);
    return { success: true, counterpart };
  }
}
