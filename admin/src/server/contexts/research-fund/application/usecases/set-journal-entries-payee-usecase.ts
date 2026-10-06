import "server-only";
import type { JournalTarget } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { acceptPayeeLinkTargets } from "@/server/contexts/research-fund/application/services/payee-link-targets";
import { isBigIntId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  payeeAccessRejection,
  type Payee,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 選んだ支出の仕訳に、人の手で既存の支払先を紐づける・外す（紐づけ元は「手動」と記録する）。
 *
 * 支払先は帳簿と同じ議員のものだけを紐づけられる（別の議員＝別テナントの支払先は見つからない扱い）。
 * 支払先は議員課提出用の帳簿の情報で公開内容を変えないので、公開中の仕訳でも変更でき、
 * webapp のキャッシュは無効化しない。同じ書類の仕訳をまとめて紐づけるときは、画面が対象に含めて送る。
 */
export class SetJournalEntriesPayeeUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private payeeRepository: PayeeRepository,
  ) {}

  /** payeeId が null なら紐づけを外す */
  async execute(bookId: string, targets: readonly JournalTarget[], payeeId: string | null) {
    if (payeeId !== null && !isBigIntId(payeeId))
      throw new JournalReviewError("支払先IDが不正です");
    const { politicianId, accepted } = await acceptPayeeLinkTargets(
      this.repository,
      bookId,
      targets,
    );
    let payee: Payee | null = null;
    if (payeeId !== null) {
      payee = await this.payeeRepository.find(politicianId, payeeId);
      const rejection = payeeAccessRejection(payee, politicianId);
      if (rejection) throw new JournalReviewError(rejection);
    }
    await this.repository.setPayee(bookId, accepted, payeeId);
    return { updated: accepted.length, payee };
  }
}
