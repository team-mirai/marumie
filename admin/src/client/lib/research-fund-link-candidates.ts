import type { LinkCandidate } from "@/server/contexts/research-fund/domain/models/expenditure-group";

/** 紐づけ候補の表示の切り替え */
export type LinkStateFilter = "all" | "unlinked" | "this-group";

/** 支出群の編集画面で、紐づけ候補の仕訳を探す条件 */
export interface LinkCandidateFilter {
  state: LinkStateFilter;
  /** 摘要・支払先・科目・特記事項・備考のいずれかに含む文字列。空白だけなら絞り込まない */
  query: string;
  /** YYYY-MM-DD。空文字なら下限なし */
  dateFrom: string;
  /** YYYY-MM-DD。空文字なら上限なし */
  dateTo: string;
  /** 円。空欄・数字でない値なら下限なし */
  amountMin: string;
  /** 円。空欄・数字でない値なら上限なし */
  amountMax: string;
}

export const EMPTY_LINK_CANDIDATE_FILTER: LinkCandidateFilter = {
  state: "all",
  query: "",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

/** 他の支出群に紐づいていて、この支出群（新規なら null）では選べない仕訳か */
export function isTakenByOtherGroup(entry: LinkCandidate, groupId: string | null): boolean {
  return entry.groupId !== null && entry.groupId !== groupId;
}

function amountBound(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (normalized === "") return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function matchesQuery(entry: LinkCandidate, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return [entry.description, entry.payeeName, entry.accountLabel, entry.note, entry.memo].some(
    (text) => text?.toLowerCase().includes(needle),
  );
}

/**
 * 紐づけ候補の絞り込み。
 * 「未紐づけ」「この支出群」は保存済みの紐づけで判定し、「この支出群」には選択中の仕訳も含める。
 * チェックを付け外ししても行が一覧から消えないようにするため。
 */
export function filterLinkCandidates(
  entries: readonly LinkCandidate[],
  filter: LinkCandidateFilter,
  groupId: string | null,
  selected: ReadonlySet<string>,
): LinkCandidate[] {
  const amountMin = amountBound(filter.amountMin);
  const amountMax = amountBound(filter.amountMax);
  return entries.filter(
    (entry) =>
      (filter.state !== "unlinked" || entry.groupId === null) &&
      (filter.state !== "this-group" ||
        selected.has(entry.id) ||
        (groupId !== null && entry.groupId === groupId)) &&
      (filter.dateFrom === "" || entry.entryDate >= filter.dateFrom) &&
      (filter.dateTo === "" || entry.entryDate <= filter.dateTo) &&
      (amountMin === null || entry.amount >= amountMin) &&
      (amountMax === null || entry.amount <= amountMax) &&
      matchesQuery(entry, filter.query),
  );
}
