import {
  isAccountUnconfirmed,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import { isPayeeUnset } from "@/server/contexts/research-fund/domain/models/payee";
import { isReceiptMissing } from "@/server/contexts/research-fund/domain/models/receipt-absence";
import { RECEIPT_CATEGORIES } from "@/server/contexts/research-fund/domain/models/receipt-categories";

/** 仕訳の確認・編集画面の一覧の絞り込み条件（状態タブを除く） */
interface JournalListFilter {
  /** "01"〜"12"。空文字ならすべての月 */
  month: string;
  /** 空文字ならすべての立替者 */
  advancer: string;
  unsettledOnly: boolean;
  payeeUnsetOnly: boolean;
  receiptMissingOnly: boolean;
  /** 科目・項目・支払先のいずれかに含む文字列。空白だけなら絞り込まない */
  query: string;
}

/** 一覧の「科目」列に出すラベル。支給は「支給」、科目が未確定なら「要確認」 */
export function journalAccountLabel(entry: Pick<ReviewEntry, "source" | "accountKey">): string {
  if (entry.source === "grant") return "支給";
  const label = RECEIPT_CATEGORIES[entry.accountKey as keyof typeof RECEIPT_CATEGORIES]?.label;
  return isAccountUnconfirmed(entry.accountKey) || label === undefined ? "要確認" : label;
}

/**
 * 一覧に表示している科目名・項目・支払先名のいずれかに検索語を含むか。
 * 支給の行は支払先を表示していないので、支払先では照合しない。
 */
function matchesQuery(
  entry: ReviewEntry,
  query: string,
  payeeNames: ReadonlyMap<string, string>,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const payeeName =
    entry.source !== "grant" && entry.payeeId !== null ? payeeNames.get(entry.payeeId) : undefined;
  return [journalAccountLabel(entry), entry.description, payeeName].some((text) =>
    text?.toLowerCase().includes(needle),
  );
}

/** 一覧の絞り込み。状態タブの件数もこの結果の中で数える */
export function filterJournalEntries(
  entries: readonly ReviewEntry[],
  filter: JournalListFilter,
  payeeNames: ReadonlyMap<string, string>,
): ReviewEntry[] {
  return entries.filter(
    (e) =>
      (!filter.month || e.entryDate.slice(5, 7) === filter.month) &&
      (!filter.unsettledOnly || (e.advancedBy !== null && e.settledAt === null)) &&
      (filter.advancer === "" || e.advancedBy === filter.advancer) &&
      (!filter.payeeUnsetOnly || isPayeeUnset(e)) &&
      (!filter.receiptMissingOnly || isReceiptMissing(e)) &&
      matchesQuery(e, filter.query, payeeNames),
  );
}
