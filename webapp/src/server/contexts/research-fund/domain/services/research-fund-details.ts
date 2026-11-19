/**
 * 帳簿の details（B-5「データについて」の説明文）を読む。
 *
 * DB では Json 型で、書き込み側の画面はまだ無い（年度クローズと details の編集UIは別途）。
 * 公開側は壊れた値でページを落とさないよう、読めた分だけを使う。
 */
interface ResearchFundDetails {
  /** 「調査研究費のデータについて」の本文。未設定なら null */
  dataNote: string | null;
}

export function parseResearchFundDetails(details: unknown): ResearchFundDetails {
  if (typeof details !== "object" || details === null || Array.isArray(details))
    return { dataNote: null };
  const dataNote = (details as Record<string, unknown>).dataNote;
  return { dataNote: typeof dataNote === "string" && dataNote.trim() ? dataNote : null };
}
