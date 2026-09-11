import type {
  PublishedAccount,
  PublishedExpense,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import { researchFundCategoryColor } from "@/server/contexts/research-fund/domain/services/research-fund-category-color";

/** 科目マスタに無い科目のラベル（要確認の仕訳は公開されない想定だが、表示は落とさない）。 */
const UNKNOWN_CATEGORY_LABEL = "その他";

/**
 * 同一注文の分割行につける説明。
 *
 * Amazon の明細を1品目ずつ起こしているため、同じ品を何度も買ったように読まれる。
 * 束ねて並べたうえで、何件で1注文なのかを特記事項として添える。
 */
export function splitGroupNote(count: number): string {
  return `同一注文で${count}点購入。1点ずつ行を分けて計上しています`;
}

function mergeNotes(note: string | null, splitNote: string | null): string | null {
  if (!splitNote) return note?.trim() ? note : null;
  return note?.trim() ? `${note}／${splitNote}` : splitNote;
}

/**
 * B-4 の明細行を組み立てる。
 *
 * 並びは日付の新しい順。同一注文（split_group）の行は必ず隣り合わせにし、
 * 何点で1注文かを特記事項に添えることで「同じものを何度も買っている」と
 * 読まれないようにする。
 */
export function buildExpenseViews(
  expenses: readonly PublishedExpense[],
  accounts: Readonly<Record<string, PublishedAccount>>,
): ResearchFundExpenseView[] {
  const splitCounts = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.splitGroup) continue;
    splitCounts.set(expense.splitGroup, (splitCounts.get(expense.splitGroup) ?? 0) + 1);
  }

  return [...expenses]
    .sort(
      (a, b) =>
        compare(b.date, a.date) ||
        // 同一注文の行が他の支出に割り込まれないよう、日付の中では注文ごとにまとめる。
        compare(a.splitGroup ?? a.id, b.splitGroup ?? b.id) ||
        compareIds(a.id, b.id),
    )
    .map((expense) => {
      const account = accounts[expense.accountKey];
      const color = researchFundCategoryColor(account?.legalCategoryKey ?? "");
      const splitCount = expense.splitGroup ? (splitCounts.get(expense.splitGroup) ?? 1) : 1;
      return {
        id: expense.id,
        entryId: expense.entryId,
        date: expense.date,
        month: expense.date.slice(0, 7),
        description: expense.description,
        amount: expense.amount,
        detailed: { label: account?.label || UNKNOWN_CATEGORY_LABEL, color },
        legal: { label: account?.legalLabel || UNKNOWN_CATEGORY_LABEL, color },
        note: mergeNotes(expense.note, splitCount > 1 ? splitGroupNote(splitCount) : null),
        hasReceipt: expense.hasReceipt,
      };
    });
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 仕訳IDは連番なので、文字列比較（"10" < "9"）にならないよう数値で比べる。 */
function compareIds(a: string, b: string): number {
  const diff = Number(a) - Number(b);
  return Number.isFinite(diff) ? diff : compare(a, b);
}
