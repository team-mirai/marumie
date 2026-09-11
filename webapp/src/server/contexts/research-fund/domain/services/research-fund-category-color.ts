/**
 * カテゴリーピルの色。
 *
 * 調研費だけ別物の見た目にしないため（デザイン仕様 §5）、既存の支出カテゴリと同じ
 * 色域を使う。法定区分ごとに1色を決め、詳細の21分類はその法定区分の色を継承する。
 */
const LEGAL_CATEGORY_COLORS: Record<string, string> = {
  personnel: "#0369A1", // ① 人件費
  utilities: "#126C81", // ② 光熱水費
  "equipment-supplies": "#4D7C0F", // ③ 備品・消耗品費
  office: "#047857", // ④ 事務所費
  exchange: "#C2410C", // ⑤ 交流費
  publicity: "#A16207", // ⑥ 広報紙誌の発行その他の事業費
  research: "#047857", // ⑦ 調査研究費
  donation: "#BE185D", // ⑧ 寄附
  stay: "#0369A1", // ⑨ 滞在費
  "other-expenses": "#334155", // ⑩ その他の経費
};

/** 法定区分に色が無い科目（要確認など）のフォールバック。 */
const FALLBACK_COLOR = "#334155";

export function researchFundCategoryColor(legalCategoryKey: string): string {
  return LEGAL_CATEGORY_COLORS[legalCategoryKey] ?? FALLBACK_COLOR;
}
