import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { validateAdvancedBy } from "@/server/contexts/research-fund/domain/models/advance";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 選んだ支出の仕訳の立替者をまとめて設定・解除する（空白だけの入力は解除）。
 *
 * 立替は仕訳として計上しない事務所内の管理情報なので、公開中の仕訳でも変更できる。
 * 公開内容（日付・金額・項目名・科目・特記事項）は変わらないので、webapp のキャッシュは無効化しない。
 */
export class SetJournalEntriesAdvancedByUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, targets: readonly JournalTarget[], advancedBy: string) {
    const validated = validateAdvancedBy(advancedBy);
    if (validated.status === "invalid") throw new JournalReviewError(validated.errors[0].message);
    const updating = await acceptJournalEntries(
      this.repository,
      bookId,
      targets,
      JournalOperation.setAdvancedBy,
      {
        action: "立替者を設定する",
        cannot: "立替者を設定できない",
        notDone: "変更しませんでした",
        missing: "立替者を設定できない仕訳（支給・返還など）が選ばれています",
      },
    );
    await this.repository.setAdvancedBy(bookId, updating, validated.value);
    return { updated: updating.length, advancedBy: validated.value };
  }
}
