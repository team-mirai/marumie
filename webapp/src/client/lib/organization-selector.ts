import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";

interface ResearchFundSelectorGroup {
  /** 公開中で、選んで調研費ページを開ける議員 */
  selectable: ResearchFundPoliticianEntry[];
  /** 準備中の議員をまとめた1行の表記（「安野貴博 ほか11人」）。準備中が居なければ null */
  upcomingLabel: string | null;
}

/**
 * 組織セレクタの「調研費（議員別）」グループの並びを組み立てる。
 * 準備中の議員は1人ずつ並べず、先頭の1人の氏名＋残りの人数の1行にまとめる。
 */
export function groupResearchFundPoliticians(
  politicians: ResearchFundPoliticianEntry[],
): ResearchFundSelectorGroup {
  const selectable = politicians.filter((politician) => politician.ready);
  const upcoming = politicians.filter((politician) => !politician.ready);

  const [first, ...rest] = upcoming;
  const upcomingLabel = first
    ? rest.length > 0
      ? `${first.name} ほか${rest.length}人`
      : first.name
    : null;

  return { selectable, upcomingLabel };
}

/** 調研費ページを開いているときのセレクタの表示名（「峰島侑也（調研費）」）。 */
export function formatResearchFundSelectorLabel(politicianName: string): string {
  return `${politicianName}（調研費）`;
}
