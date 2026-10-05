import "server-only";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/** 仕訳の確認画面に表示する仕訳・科目・立替者の候補を取得する */
export class ListJournalReviewUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string) {
    return {
      entries: await this.repository.list(bookId),
      accounts: (await this.repository.accounts()).filter((a) => a.type === "expense"),
      // 立替者の入力欄の候補。表記ゆれで立替者ごとの集計が分かれないようにする。
      advancers: await this.repository.advancers(bookId),
    };
  }
}
