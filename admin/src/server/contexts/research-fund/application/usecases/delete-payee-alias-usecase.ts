import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { PayeeError } from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 支払先に記録された表記を削除する。削除した表記はそれ以降の書類の照合に使われない。
 * 対象は議員の支払先の表記だけで、別の議員・別の支払先の表記は「見つからない」として扱う。
 */
export class DeletePayeeAliasUsecase {
  constructor(private repository: PayeeRepository) {}
  async execute(politicianId: string, payeeId: string, aliasId: string) {
    if (!isBigIntId(politicianId)) throw new PayeeError("議員IDが不正です");
    if (!isBigIntId(payeeId) || !isBigIntId(aliasId)) throw new PayeeError("表記が見つかりません");
    const deleted = await this.repository.deleteAlias(politicianId, payeeId, aliasId);
    if (!deleted) throw new PayeeError("表記が見つかりません");
  }
}
