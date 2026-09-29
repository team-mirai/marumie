import type {
  PublishedAccount,
  PublishedExpense,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type {
  ResearchFundCategoryView,
  ResearchFundExpenseView,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";
import { researchFundCategoryColor } from "@/server/contexts/research-fund/domain/services/research-fund-category-color";
import { researchFundCategoryDescription } from "@/server/contexts/research-fund/domain/services/research-fund-category-description";
import { receiptKindOf } from "@/server/contexts/research-fund/domain/services/research-fund-receipt-kind";

/** 科目マスタに無い科目のラベル（要確認の仕訳は公開されない想定だが、表示は落とさない）。 */
const UNKNOWN_CATEGORY_LABEL = "その他";

/**
 * 支給（入金）の行のカテゴリー。区分トグル（詳細／法律上）のどちらでも入金と分かるよう同じ名前にし、
 * 色は政治団体の出入金明細の入金と同じ緑にする。
 */
const GRANT_CATEGORY: ResearchFundCategoryView = { label: "支給（入金）", color: "#238778" };

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
 * B-4 の明細行を組み立てる。支給（入金）と支出（出金）を同じ一覧に混ぜる。
 *
 * 並びは日付の新しい順。同一注文（split_group）の行は必ず隣り合わせにし、
 * 何点で1注文かを特記事項に添えることで「同じものを何度も買っている」と
 * 読まれないようにする。
 *
 * groupIdByEntryId は仕訳ID → 支出群ID。用途カードと明細を相互にリンクするのに使う。
 */
export function buildExpenseViews(
  expenses: readonly PublishedExpense[],
  accounts: Readonly<Record<string, PublishedAccount>>,
  groupIdByEntryId: ReadonlyMap<string, string> = new Map(),
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
        compare(a.splitGroup ?? "", b.splitGroup ?? "") ||
        compareIds(a.id, b.id),
    )
    .map((expense) => {
      if (expense.kind === "grant") {
        return {
          kind: expense.kind,
          id: expense.id,
          entryId: expense.entryId,
          date: expense.date,
          month: expense.date.slice(0, 7),
          description: expense.description,
          amount: expense.amount,
          detailed: GRANT_CATEGORY,
          legal: GRANT_CATEGORY,
          note: mergeNotes(expense.note, null),
          splitGroup: null,
          // 用途カードは支出だけを束ねるので、支給は紐づけない。
          groupId: null,
          hasReceipt: expense.hasReceipt,
          receiptKind: expense.hasReceipt ? receiptKindOf(expense.receiptMime) : null,
        };
      }
      const account = accounts[expense.accountKey];
      const color = researchFundCategoryColor(account?.legalCategoryKey ?? "");
      const description = researchFundCategoryDescription(expense.accountKey);
      const splitCount = expense.splitGroup ? (splitCounts.get(expense.splitGroup) ?? 1) : 1;
      return {
        kind: expense.kind,
        id: expense.id,
        entryId: expense.entryId,
        date: expense.date,
        month: expense.date.slice(0, 7),
        description: expense.description,
        amount: expense.amount,
        detailed: {
          label: account?.label || UNKNOWN_CATEGORY_LABEL,
          color,
          ...(description && { description }),
        },
        legal: { label: account?.legalLabel || UNKNOWN_CATEGORY_LABEL, color },
        note: mergeNotes(expense.note, splitCount > 1 ? splitGroupNote(splitCount) : null),
        splitGroup: expense.splitGroup,
        groupId: groupIdByEntryId.get(expense.entryId) ?? null,
        hasReceipt: expense.hasReceipt,
        receiptKind: expense.hasReceipt ? receiptKindOf(expense.receiptMime) : null,
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
