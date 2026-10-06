import "server-only";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import {
  JournalPosting,
  type ResearchFundAccount,
} from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  journalEditSchema,
  type JournalEdit,
  type JournalWrite,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 支出の決済科目。調研費の支出は調研費口座からの払い出しなので普通預金に固定する */
const ASSET_ACCOUNT_KEY = "bank";

interface ExpenseJournalWriteInput {
  /** 画面から送られた入力（未検証） */
  raw: JournalEdit;
  source: "manual" | "scan";
  /** 読み取り元の書類。手入力なら null */
  documentId: string | null;
  status: JournalWrite["status"];
  /** 帳簿の年度。帳簿が無ければ null */
  year: number | null;
  accounts: readonly ResearchFundAccount[];
}

/**
 * 支出の仕訳を保存できる形（複式の行・重複検知の hash）に組み立てる。
 *
 * 手入力と編集の保存で同じ不変条件（仕訳日は帳簿の年度内・費用科目と普通預金の 2 行・
 * hash は書類を含めて作る）を守るため、組み立てはここ 1 か所に置く。
 * 科目が要確認のまま確認済にできないルールは JournalOperation（approve / edit）が持つので、ここでは扱わない。
 */
export function buildExpenseJournalWrite(
  input: ExpenseJournalWriteInput,
): ResearchFundResult<JournalWrite> {
  const parsed = journalEditSchema.safeParse(input.raw);
  if (!parsed.success)
    return invalidResearchFundResult(
      "input",
      RF_ERROR_CODES.INVALID_JOURNAL_INPUT,
      "日付・金額・項目名・科目を正しく入力してください",
    );
  const edit = parsed.data;
  if (!input.year || Number(edit.entryDate.slice(0, 4)) !== input.year)
    return invalidResearchFundResult(
      "entryDate",
      RF_ERROR_CODES.INVALID_DATE,
      "帳簿の年度内の日付を指定してください",
    );
  const account = input.accounts.find((candidate) => candidate.key === edit.accountKey);
  const assetAccount = input.accounts.find((candidate) => candidate.key === ASSET_ACCOUNT_KEY);
  if (!account || !assetAccount)
    return invalidResearchFundResult(
      "account",
      RF_ERROR_CODES.INVALID_ACCOUNT,
      "科目が見つかりません",
    );
  const posting = JournalPosting.generate({
    pattern: "expense",
    source: input.source,
    amount: edit.amount,
    account,
    assetAccount,
  });
  if (posting.status === "invalid") return posting;
  const hash = JournalEntryHash.generate({ ...edit, documentId: input.documentId });
  if (hash.status === "invalid") return hash;
  return {
    status: "valid",
    value: { ...edit, status: input.status, hash: hash.value, lines: posting.value.lines },
  };
}
