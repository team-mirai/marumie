/** 支出群に紐づけた仕訳。金額・件数・期間はここから自動集計し、手入力させない。 */
export interface LinkedEntry {
  /** 帳簿上の日付（YYYY-MM-DD）。タイムゾーンによる月のずれを避ける。 */
  readonly entryDate: string;
  readonly amount: number;
}

export interface LinkedEntrySummary {
  amount: number;
  count: number;
  /** 紐づけが無ければ null */
  period: { start: string; end: string } | null;
}

/** 紐づけた仕訳から金額・件数・期間を集計する。admin の編集画面と公開側で同じ値を出す。 */
export function aggregateLinkedEntries(entries: readonly LinkedEntry[]): LinkedEntrySummary {
  const dates = entries.map((entry) => entry.entryDate).sort();
  return {
    amount: entries.reduce((total, entry) => total + entry.amount, 0),
    count: entries.length,
    period: dates.length === 0 ? null : { start: dates[0], end: dates[dates.length - 1] },
  };
}
