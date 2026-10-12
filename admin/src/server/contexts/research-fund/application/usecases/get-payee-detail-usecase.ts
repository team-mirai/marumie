import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 支払先の詳細（帳簿でその支払先に紐づいた仕訳と、支払先に記録された表記と、削除したときの影響つき）を取得する。
 * 不正な ID・存在しない支払先・別の議員の支払先は、区別せず null を返す（詳細ページは 404 にする）。
 */
export class GetPayeeDetailUsecase {
  constructor(private repository: PayeeRepository) {}
  async execute(politicianId: string, bookId: string, id: string) {
    if (!isBigIntId(politicianId) || !isBigIntId(bookId) || !isBigIntId(id)) return null;
    const payee = await this.repository.find(politicianId, id);
    if (!payee) return null;
    const entries = await this.repository.listJournalEntries(politicianId, id, bookId);
    const aliases = await this.repository.listAliases(politicianId, id);
    const deletion = await this.repository.deletionImpact(politicianId, id);
    if (!deletion) return null;
    return { payee, entries, aliases, deletion };
  }
}
