/**
 * 仕訳の確認画面で金額を強調するかの判定。
 *
 * 調研費の支出は 1 万円以上かどうかで議員課に提出する帳簿での扱いが変わり、確認の重要度も違う。
 * 一覧で小額の行に埋もれないよう、1 万円以上（1 万円ちょうどを含む）の金額だけ控えめに強調する。
 * 帳簿の「1万円超として扱う」の判定ルール（同じ領収書の分割明細の合算など）とは別物で、
 * ここでは仕訳 1 件の金額だけを見る。
 */

/** 金額を強調する下限（円）。この額以上を強調する */
const EMPHASIS_THRESHOLD = 10_000;

/** 一覧で金額を強調するか */
export function isEmphasizedJournalAmount(amount: number): boolean {
  return amount >= EMPHASIS_THRESHOLD;
}
