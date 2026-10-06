import "server-only";
import {
  grantDescription,
  grantEntryDate,
  validateGrantAmount,
  validateGrantEntryDate,
  type GrantWrite,
} from "@/server/contexts/research-fund/domain/models/grant-registration";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import {
  JournalPosting,
  type ResearchFundAccount,
} from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 支給は調研費口座への振込なので、収入科目と入金先はどちらも固定 */
const INCOME_ACCOUNT_KEY = "grant-income";
const ASSET_ACCOUNT_KEY = "bank";

interface GrantJournalWriteInput {
  /** 支給の対象月（YYYY-MM） */
  month: string;
  /** 支給の起点となる当選日（YYYY-MM-DD） */
  termStart: string;
  amount: number;
  /** 手入力された支給日。省略時はその月の既定日（当選月は当選日） */
  entryDate?: string;
  /** 既存の支給を編集するときは保存済みの項目名を渡す（hash を変えないため）。省略時は月から決まる */
  description?: string;
  accounts: readonly ResearchFundAccount[];
}

/**
 * 支給の仕訳を保存できる形（複式の行・重複検知の hash）に組み立てる。
 *
 * 登録と支給日の編集で同じ不変条件（支給日はその月の中・当選月は当選日以降・
 * 借方 普通預金／貸方 調査研究費収入の 2 行・hash は書類なしで作る）を守るため、組み立てはここ 1 か所に置く。
 * hash は支給日を含むので、支給日を変えて組み立て直すと hash も作り直される。
 */
export function buildGrantJournalWrite(
  input: GrantJournalWriteInput,
): ResearchFundResult<GrantWrite> {
  const { month, termStart, accounts } = input;
  const entryDate = validateGrantEntryDate(
    month,
    termStart,
    input.entryDate ?? grantEntryDate(month, termStart),
  );
  if (entryDate.status === "invalid") return entryDate;
  const amount = validateGrantAmount(input.amount);
  if (amount.status === "invalid") return amount;
  const account = accounts.find((candidate) => candidate.key === INCOME_ACCOUNT_KEY);
  const assetAccount = accounts.find((candidate) => candidate.key === ASSET_ACCOUNT_KEY);
  if (!account || !assetAccount)
    return invalidResearchFundResult(
      "account",
      RF_ERROR_CODES.INVALID_ACCOUNT,
      "科目が見つかりません",
    );
  const posting = JournalPosting.generate({
    pattern: "grant",
    source: "grant",
    amount: amount.value,
    account,
    assetAccount,
  });
  if (posting.status === "invalid") return posting;
  const description = input.description ?? grantDescription(month);
  const hash = JournalEntryHash.generate({
    entryDate: entryDate.value,
    amount: amount.value,
    description,
    documentId: null,
  });
  if (hash.status === "invalid") return hash;
  return {
    status: "valid",
    value: {
      entryDate: entryDate.value,
      description,
      amount: amount.value,
      hash: hash.value,
      lines: posting.value.lines,
    },
  };
}
