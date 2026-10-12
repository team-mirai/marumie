import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { PayeeError } from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 同じ議員の支払先 sourceId を targetId に統合する（domain/models/payee-merge）。
 * 統合元に紐づいていた議員のすべての帳簿の仕訳は統合先に紐づき、統合元の表記と名称は統合先の表記になって
 * 以後の照合に使われる。統合元は消える。
 * インボイス登録番号の食い違いは、統合の時点で確かめて拒否する（確認画面を開いたあとに直された場合も含む）。
 * 別の議員の支払先は「見つからない」として扱う。
 */
export class MergePayeesUsecase {
  constructor(private repository: PayeeRepository) {}
  async execute(politicianId: string, targetId: string, sourceId: string) {
    if (!isBigIntId(politicianId)) throw new PayeeError("議員IDが不正です");
    if (!isBigIntId(targetId) || !isBigIntId(sourceId))
      throw new PayeeError("支払先が見つかりません");
    if (targetId === sourceId) throw new PayeeError("同じ支払先どうしは統合できません");
    const result = await this.repository.merge(politicianId, targetId, sourceId);
    if (result.status === "not-found") throw new PayeeError("支払先が見つかりません");
    if (result.status === "rejected") throw new PayeeError(result.reason);
    return { movedEntryCount: result.movedEntryCount };
  }
}
