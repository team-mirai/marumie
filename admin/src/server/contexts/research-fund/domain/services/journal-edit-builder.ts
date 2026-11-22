import "server-only";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  journalEditSchema,
  type JournalEdit,
  type JournalWrite,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import { buildExpenseJournalWrite } from "@/server/contexts/research-fund/domain/services/expense-journal-builder";
import { buildGrantJournalWrite } from "@/server/contexts/research-fund/domain/services/grant-journal-builder";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

interface JournalEditWriteInput {
  /** 編集する保存済みの仕訳 */
  entry: ReviewEntry;
  /** 画面から送られた入力（未検証） */
  raw: JournalEdit;
  /** 確認つきで保存するか（保存と同時に確認済にする） */
  approve: boolean;
  /** 帳簿の年度。帳簿が無ければ null（支出の仕訳日の検証に使う） */
  year: number | null;
  /** 帳簿の当選日。帳簿が無ければ null（支給日の検証に使う） */
  termStart: string | null;
  accounts: readonly ResearchFundAccount[];
}

/**
 * 確認画面で編集した仕訳を、保存できる形に組み立てる。
 *
 * - 支出の仕訳は内容を直せる。確認つきで保存すれば確認済になり、そうでなければ今の状態のまま
 * - 支給の仕訳は支給日だけを直せる。どの月の支給かは登録時の仕訳日の年月で決まり、状態は変わらない
 *
 * 公開中・精算済・確認済への遷移の可否は JournalOperation（edit / approve）が判定するので、ここでは扱わない。
 */
export function buildJournalEditWrite(
  input: JournalEditWriteInput,
): ResearchFundResult<JournalWrite> {
  const { entry, raw, approve, year, accounts } = input;
  if (entry.source === "grant") return buildGrantEditWrite(input);
  return buildExpenseJournalWrite({
    raw,
    source: entry.source,
    documentId: entry.documentId,
    status: approve ? "approved" : entry.status,
    year,
    accounts,
  });
}

function buildGrantEditWrite({
  entry,
  raw,
  termStart,
  accounts,
}: JournalEditWriteInput): ResearchFundResult<JournalWrite> {
  const parsed = journalEditSchema.safeParse(raw);
  if (!parsed.success)
    return invalidResearchFundResult(
      "entryDate",
      RF_ERROR_CODES.INVALID_JOURNAL_INPUT,
      "支給日を正しく入力してください",
    );
  const edit = parsed.data;
  const rejection = JournalOperation.editGrant(entry, edit);
  if (rejection)
    return invalidResearchFundResult("input", RF_ERROR_CODES.INVALID_JOURNAL_INPUT, rejection.one);
  if (!termStart)
    return invalidResearchFundResult(
      "book",
      RF_ERROR_CODES.INVALID_BOOK_METADATA,
      "帳簿が見つかりません",
    );
  const write = buildGrantJournalWrite({
    // どの月の支給かは登録時の仕訳日が持つ。項目名は hash を変えないため保存済みのものを渡す。
    month: entry.entryDate.slice(0, 7),
    termStart,
    entryDate: edit.entryDate,
    amount: entry.amount,
    description: entry.description,
    accounts,
  });
  if (write.status === "invalid") return write;
  return {
    status: "valid",
    value: {
      ...edit,
      entryDate: write.value.entryDate,
      status: entry.status,
      hash: write.value.hash,
      lines: write.value.lines,
    },
  };
}
