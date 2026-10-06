import "server-only";
import { sortPayees } from "@/server/contexts/research-fund/domain/models/payee";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/** 仕訳の確認画面に表示する仕訳・科目・立替者の候補・支払先を取得する */
export class ListJournalReviewUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private payeeRepository: PayeeRepository,
  ) {}
  async execute(bookId: string) {
    const politicianId = await this.repository.politicianId(bookId);
    return {
      entries: await this.repository.list(bookId),
      accounts: (await this.repository.accounts()).filter((a) => a.type === "expense"),
      // 立替者の入力欄の候補。表記ゆれで立替者ごとの集計が分かれないようにする。
      advancers: await this.repository.advancers(bookId),
      // 紐づけの候補は帳簿の議員の支払先だけ（別の議員の支払先は見せない）。
      payees:
        politicianId === null ? [] : sortPayees(await this.payeeRepository.list(politicianId)),
    };
  }
}
