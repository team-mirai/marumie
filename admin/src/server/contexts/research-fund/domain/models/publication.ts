import type { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
import type { ResearchFundCategory, ResearchFundRow } from "@/shared/research-fund/aggregation";

/** 公開の候補として選べる確認済・未公開の仕訳。集計にそのまま渡せるよう行を兼ねる。 */
export interface PublishCandidate extends ResearchFundRow {
  id: string;
  description: string;
}

/** 公開画面が描く before / after の材料。before は公開済みだけ、after は候補を足して集計する。 */
export interface PublicationSnapshot {
  published: ResearchFundRow[];
  candidates: PublishCandidate[];
  accounts: Record<string, ResearchFundCategory>;
  publishedThrough: string | null;
}

/** 公開の可否判定に必要な最小限の仕訳。状態遷移は JournalEntry が持つ。 */
export interface PublishableEntry extends JournalEntry {
  id: string;
  entryDate: string;
}

export class PublicationError extends Error {}

function monthEnd(date: string): string {
  const [year, month] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export const Publication = {
  /**
   * 公開範囲（published_through）を、公開した仕訳の最新月末まで進める。
   * 既に先まで公開している場合は後退させない（過去分の追加公開で表記が戻らないように）。
   */
  advancePublishedThrough(current: string | null, dates: readonly string[]): string | null {
    if (dates.length === 0) return current;
    const latest = monthEnd(dates.reduce((a, b) => (a > b ? a : b)));
    return current && current > latest ? current : latest;
  },
};
