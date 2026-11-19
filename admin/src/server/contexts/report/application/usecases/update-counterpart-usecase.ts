import "server-only";

import type {
  Counterpart,
  UpdateCounterpartInput,
} from "@/server/contexts/report/domain/models/counterpart";
import { validateCounterpartInput } from "@/server/contexts/report/domain/models/counterpart";
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

    const newName = input.name?.trim() ?? existing.name;
    // undefinedなら既存値を維持、それ以外（nullや文字列）はtrim後に空文字ならnullに正規化
    const newPostalCode =
      input.postalCode === undefined ? existing.postalCode : input.postalCode?.trim() || null;
    const newAddress =
      input.address === undefined ? existing.address : input.address?.trim() || null;

    const validationErrors = validateCounterpartInput({
      name: newName,
      postalCode: newPostalCode,
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
      postalCode: newPostalCode,
      address: newAddress,
    });
    return { success: true, counterpart };
  }
}
