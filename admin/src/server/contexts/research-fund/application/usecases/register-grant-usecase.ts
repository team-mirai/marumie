import "server-only";
import { ListGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/list-grants-usecase";
import {
  GrantRegistrationError,
  grantDescription,
  grantEntryDate,
  isGrantMonth,
  japanCalendarDate,
  validateGrantAmount,
  validateGrantEntryDate,
} from "@/server/contexts/research-fund/domain/models/grant-registration";
import { GrantSchedule } from "@/server/contexts/research-fund/domain/models/grant-schedule";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import { JournalPosting } from "@/server/contexts/research-fund/domain/models/journal-posting";
import type { GrantRepository } from "@/server/contexts/research-fund/domain/repositories/grant-repository.interface";

/** 下書きを経ず確認済で支給の収入仕訳を作る。振込は機械的なため目視確認を挟まない。 */
export class RegisterGrantUsecase {
  private listGrants: ListGrantsUsecase;

  constructor(private repository: GrantRepository) {
    this.listGrants = new ListGrantsUsecase(repository);
  }

  async execute(
    bookId: string,
    month: string,
    userId: string,
    referenceDate: string = japanCalendarDate(),
    /** 手入力された支給日。省略時はその月の既定日（当選月は当選日）。 */
    inputEntryDate?: string,
    /** 手入力された支給額。省略時は自動計算の額（当選月は日割）。 */
    inputAmount?: number,
  ) {
    if (!isGrantMonth(month)) throw new GrantRegistrationError("月はYYYY-MM形式で指定してください");
    const { grants, termStart } = await this.listGrants.execute(bookId, referenceDate);
    const registrable = GrantSchedule.registrable(grants, month);
    if (registrable.status === "invalid")
      throw new GrantRegistrationError(registrable.errors[0].message);
    const grant = registrable.value;

    // 画面を経由しない呼び出しも同じ判定で弾く。
    const entryDate = inputEntryDate ?? grantEntryDate(month, termStart);
    const validatedEntryDate = validateGrantEntryDate(month, termStart, entryDate);
    if (validatedEntryDate.status === "invalid")
      throw new GrantRegistrationError(validatedEntryDate.errors[0].message);
    const validatedAmount = validateGrantAmount(
      inputAmount === undefined ? grant.amount : inputAmount,
    );
    if (validatedAmount.status === "invalid")
      throw new GrantRegistrationError(validatedAmount.errors[0].message);
    const amount = validatedAmount.value;

    const accounts = await this.repository.accounts();
    const account = accounts.find((candidate) => candidate.key === "grant-income");
    const assetAccount = accounts.find((candidate) => candidate.key === "bank");
    if (!account || !assetAccount) throw new GrantRegistrationError("科目が見つかりません");
    const posting = JournalPosting.generate({
      pattern: "grant",
      source: "grant",
      amount,
      account,
      assetAccount,
    });
    if (posting.status === "invalid") throw new GrantRegistrationError(posting.errors[0].message);

    const description = grantDescription(month);
    const hash = JournalEntryHash.generate({
      entryDate,
      amount,
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
        amount,
        hash: hash.value,
        lines: posting.value.lines,
      },
      userId,
    );
  }
}
