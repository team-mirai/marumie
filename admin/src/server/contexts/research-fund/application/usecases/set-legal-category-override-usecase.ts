import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  type LegalCategoryOverrideInput,
  LegalCategoryOverridePolicy,
} from "@/server/contexts/research-fund/domain/models/legal-category-override";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import { buildLegalCategoryCatalog } from "@/shared/research-fund/legal-category";

/**
 * 支出の仕訳の法定区分を上書きする・上書きを外す（input が null なら外す。#1880）。
 * 帳簿で上書きが許可されていなければ拒否する。上書きには理由が必須。
 *
 * 法律上の区分は公開ページにも出るので、内容の編集と同じく公開中の仕訳では変更できない
 * （公開中の仕訳の内容は公開の操作を通してしか変わらない）。そのため webapp のキャッシュは無効化しない。
 * 保存後の仕訳の更新時刻を返す（続けて同じ仕訳に別の操作を送るときの照合に使う）。
 */
export class SetLegalCategoryOverrideUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(
    bookId: string,
    id: string,
    updatedAt: string,
    input: LegalCategoryOverrideInput | null,
    userId: string,
  ) {
    const allowed = await this.repository.legalCategoryOverrideAllowed(bookId);
    const entry = await acceptJournalEntry(this.repository, bookId, id, updatedAt, (found) => {
      const rejection = LegalCategoryOverridePolicy.entryRejection(found, allowed);
      return rejection ? { one: rejection, many: rejection } : null;
    });
    if (input === null) {
      if (entry.legalCategoryOverride === null)
        throw new JournalReviewError("この仕訳の法定区分は上書きされていません");
      return this.repository.setLegalCategoryOverride(bookId, entry, null, userId);
    }
    const accounts = await this.repository.accounts();
    const account = accounts.find((a) => a.key === entry.accountKey);
    const validation = LegalCategoryOverridePolicy.validate(
      input,
      account?.legalCategoryKey ?? null,
      buildLegalCategoryCatalog(accounts),
    );
    if (validation.status === "invalid") throw new JournalReviewError(validation.errors[0].message);
    return this.repository.setLegalCategoryOverride(bookId, entry, validation.value, userId);
  }
}
