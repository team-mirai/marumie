import "server-only";
import {
  GrantRegistrationError,
  grantDescription,
  grantEntryDate,
  isGrantMonth,
  japanCalendarDate,
} from "@/server/contexts/research-fund/domain/models/grant-registration";
import { GrantSchedule } from "@/server/contexts/research-fund/domain/models/grant-schedule";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import { JournalPosting } from "@/server/contexts/research-fund/domain/models/journal-posting";
import type { GrantRepository } from "@/server/contexts/research-fund/domain/repositories/grant-repository.interface";

export class ManageGrantsUsecase {
  constructor(private repository: GrantRepository) {}

  async list(bookId: string, referenceDate: string = japanCalendarDate()) {
    const book = await this.repository.book(bookId);
    if (!book) throw new GrantRegistrationError("帳簿が見つかりません");
    const schedule = GrantSchedule.generate({
      termStart: book.termStart,
      financialYear: book.financialYear,
      referenceDate,
      registeredMonths: await this.repository.registeredMonths(bookId),
    });
    if (schedule.status === "invalid") throw new GrantRegistrationError(schedule.errors[0].message);
    return { grants: schedule.value, termStart: book.termStart, financialYear: book.financialYear };
  }

  /** 下書きを経ず確認済で支給の収入仕訳を作る。振込は機械的なため目視確認を挟まない。 */
  async register(
    bookId: string,
    month: string,
    userId: string,
    referenceDate: string = japanCalendarDate(),
  ) {
    if (!isGrantMonth(month)) throw new GrantRegistrationError("月はYYYY-MM形式で指定してください");
    const { grants, termStart } = await this.list(bookId, referenceDate);
    const grant = grants.find((candidate) => candidate.month === month);
    if (!grant) throw new GrantRegistrationError("この年度に支給のない月です");
    if (grant.status === "registered")
      throw new GrantRegistrationError("この月の支給はすでに登録されています");
    if (grant.status === "upcoming") throw new GrantRegistrationError("支給日が到来していません");

    const accounts = await this.repository.accounts();
    const account = accounts.find((candidate) => candidate.key === "grant-income");
    const assetAccount = accounts.find((candidate) => candidate.key === "bank");
    if (!account || !assetAccount) throw new GrantRegistrationError("科目が見つかりません");
    const posting = JournalPosting.generate({
      pattern: "grant",
      source: "grant",
      amount: grant.amount,
      account,
      assetAccount,
    });
    if (posting.status === "invalid") throw new GrantRegistrationError(posting.errors[0].message);

    const entryDate = grantEntryDate(month, termStart);
    const description = grantDescription(month);
    const hash = JournalEntryHash.generate({
      entryDate,
      amount: grant.amount,
      description,
      documentId: null,
    });
    if (hash.status === "invalid") throw new GrantRegistrationError(hash.errors[0].message);
    return this.repository.create(
      bookId,
      month,
      {
        entryDate,
        description,
        amount: grant.amount,
        hash: hash.value,
        lines: posting.value.lines,
      },
      userId,
    );
  }
}
