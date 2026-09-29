import type { ResearchFundMonthView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface DataNoteSource {
  /** 帳簿の説明文（details.dataNote）。未設定なら null */
  dataNote: string | null;
  nextUpdateNote: string | null;
  monthly: readonly ResearchFundMonthView[];
  unused: number;
}

/**
 * B-5「調研費のデータについて」の本文。
 *
 * 掲載範囲と分類の説明は帳簿の説明文（dataNote）があればそれを優先し、無ければ既定文にする。
 * 次回更新と未使用額はデータから埋める。未使用額を数字で出すのはサンキーの最終帯とこの文の2箇所だけ。
 */
export function buildResearchFundDataNote(data: DataNoteSource): string {
  return [scopeSentence(data), updateSentence(data), unusedSentence(data)].join("");
}

function scopeSentence(data: DataNoteSource): string {
  if (data.dataNote) return data.dataNote;
  const firstGranted = data.monthly.find((month) => month.granted > 0);
  const since = firstGranted ? `${monthLabel(firstGranted.month)}の当選以降、` : "";
  return `${since}仕訳が完了した支出を掲載しています。費目は使途等報告書で定められた法律上の区分に加えて、チームみらい独自の詳細区分で表示することができます。現時点では峰島侑也議員事務所のみの試験公開ですが、今後他の所属議員の調研費も公開予定です。`;
}

function updateSentence(data: DataNoteSource): string {
  return data.nextUpdateNote
    ? `更新は不定期で、次回は${data.nextUpdateNote}の予定です。`
    : "更新は不定期です。";
}

function unusedSentence(data: DataNoteSource): string {
  const grantedMonths = data.monthly.filter((month) => month.granted > 0).length;
  const period = grantedMonths > 0 ? `${grantedMonths}ヶ月分で` : "";
  return `使わなかった分（${period}${formatMan(data.unused)}）は年末時点で確定し、国庫に返還します。`;
}

/** 「2026年2月」 */
function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${Number(year)}年${Number(monthNumber)}月`;
}

function formatMan(amount: number): string {
  return `${Math.round(amount / 10000).toLocaleString("ja-JP")}万円`;
}
