import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import {
  PayeeError,
  payeeAccessRejection,
  validatePayeeInput,
  type PayeeFormInput,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 議員の支払先を作成する（id が null）・編集する。
 * 編集は議員の支払先に限り、別の議員の支払先は id を知っていても変更できない。
 */
export class SavePayeeUsecase {
  constructor(private repository: PayeeRepository) {}
  async execute(politicianId: string, id: string | null, input: PayeeFormInput) {
    if (!isBigIntId(politicianId)) throw new PayeeError("議員IDが不正です");
    const validated = validatePayeeInput(input);
    if (validated.status === "invalid") throw new PayeeError(validated.errors[0].message);
    if (id === null) return this.repository.create(politicianId, validated.value);
    if (!isBigIntId(id)) throw new PayeeError("支払先IDが不正です");
    const rejection = payeeAccessRejection(
      await this.repository.find(politicianId, id),
      politicianId,
    );
    if (rejection) throw new PayeeError(rejection);
    return this.repository.update(politicianId, id, validated.value);
  }
}
