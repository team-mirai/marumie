import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import {
  PayeeError,
  payeeDeletionRejection,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 支払先を削除する。紐づいていた公開中でない仕訳（下書き・確認済）は支払先が未設定に戻り、
 * 支払先に記録された表記も一緒に消えて以後の照合に使われない。
 * 議員のすべての帳簿で公開中の仕訳が紐づいていれば、公開済みの内容を壊さないよう削除しない
 * （確認画面を開いたあとに公開された場合も、削除の時点で確かめて拒否する）。
 * 別の議員の支払先は「見つからない」として扱う。
 */
export class DeletePayeeUsecase {
  constructor(private repository: PayeeRepository) {}
  async execute(politicianId: string, id: string) {
    if (!isBigIntId(politicianId)) throw new PayeeError("議員IDが不正です");
    if (!isBigIntId(id)) throw new PayeeError("支払先が見つかりません");
    const result = await this.repository.delete(politicianId, id);
    if (result.status === "not-found") throw new PayeeError("支払先が見つかりません");
    if (result.status === "published") {
      throw new PayeeError(payeeDeletionRejection(result) ?? "支払先を削除できません");
    }
    return { unlinkedCount: result.unlinkedCount };
  }
}
