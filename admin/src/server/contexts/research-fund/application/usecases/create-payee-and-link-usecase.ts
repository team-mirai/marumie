import "server-only";
import type { JournalTarget } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { acceptPayeeLinkTargets } from "@/server/contexts/research-fund/application/services/payee-link-targets";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  PayeeError,
  validatePayeeInput,
  type Payee,
  type PayeeFormInput,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import type { PayeeRepository } from "@/server/contexts/research-fund/domain/repositories/payee-repository.interface";

/**
 * 仕訳の確認画面で支払先をその場で作成し、選んだ支出の仕訳に紐づける（紐づけ元は「手動」と記録する）。
 *
 * 支払先は帳簿の議員の支払先として作る。仕訳を先に確かめ、紐づけられないなら支払先も作らない。
 * 作成した支払先は人が入力したものなので確認済みとして扱う（domain/models/payee）。
 */
export class CreatePayeeAndLinkUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private payeeRepository: PayeeRepository,
  ) {}

  async execute(bookId: string, targets: readonly JournalTarget[], input: PayeeFormInput) {
    const validated = validatePayeeInput(input);
    if (validated.status === "invalid") throw new JournalReviewError(validated.errors[0].message);
    const { politicianId, accepted } = await acceptPayeeLinkTargets(
      this.repository,
      bookId,
      targets,
    );
    let payee: Payee;
    try {
      payee = await this.payeeRepository.create(politicianId, validated.value);
    } catch (error) {
      if (error instanceof PayeeError) throw new JournalReviewError(error.message);
      throw error;
    }
    await this.repository.setPayee(bookId, accepted, payee.id);
    return { updated: accepted.length, payee };
  }
}
