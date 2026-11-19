import "server-only";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { PayeeError, sortPayees } from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/** 議員の支払先の一覧（帳簿で紐づいている仕訳の件数つき）を取得する */
export class ListPayeesUsecase {
  constructor(private repository: PayeeRepository) {}
  async execute(politicianId: string, bookId: string) {
    if (!isBigIntId(politicianId)) throw new PayeeError("議員IDが不正です");
    if (!isBigIntId(bookId)) throw new PayeeError("帳簿IDが不正です");
    return sortPayees(await this.repository.list(politicianId, bookId));
  }
}
