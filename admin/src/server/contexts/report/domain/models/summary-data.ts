/**
 * SummaryData
 *
 * Domain model for the income/expense summary table (SYUUSHI07_02).
 * Contains aggregated financial data for the political fund report.
 */

/**
 * 収支総括表データ (SYUUSHI07_02)
 */
export interface SummaryData {
  // 収支総括
  syunyuSgk: number; // 収入総額 = 前年繰越額 + 本年収入額
  zennenKksGk: number; // 前年繰越額
  honnenSyunyuGk: number; // 本年収入額 = 寄附合計 + 事業収入 + 借入金 + 交付金 + その他収入
  sisyutuSgk: number; // 支出総額 = 経常経費 + 政治活動費
  yokunenKksGk: number; // 翌年繰越額 = 収入総額 - 支出総額

  // 党費（スコープ外）
  kojinFutanKgk: number | null; // 個人負担党費金額
  kojinFutanSu: number | null; // 個人負担党費員数

  // 寄附内訳
  kojinKifuGk: number; // 個人寄附 = SYUUSHI07_07 KUBUN1 の合計
  kojinKifuBikou: string | null; // 個人寄附の備考
  tokuteiKifuGk: number | null; // 特定寄附（スコープ外）
  tokuteiKifuBikou: string | null; // 特定寄附の備考
  hojinKifuGk: number | null; // 法人寄附 = SYUUSHI07_07 KUBUN2 の合計（未実装）
  hojinKifuBikou: string | null; // 法人寄附の備考
  seijiKifuGk: number | null; // 政治団体寄附 = SYUUSHI07_07 KUBUN3 の合計（未実装）
  seijiKifuBikou: string | null; // 政治団体寄附の備考
  kifuSkeiGk: number; // 寄附小計 = 個人 + 特定 + 法人 + 政治団体
  kifuSkeiBikou: string | null; // 寄附小計の備考
  atusenGk: number | null; // あっせんによるもの = SYUUSHI07_08 の合計（スコープ外）
  atusenBikou: string | null; // あっせんによるものの備考
  tokumeiKifuGk: number | null; // 政党匿名寄附 = SYUUSHI07_09 の合計（スコープ外）
  tokumeiBikou: string | null; // 政党匿名寄附の備考
  kifuGkeiGk: number; // 寄附合計 = 寄附小計 + あっせん + 政党匿名
  kifuGkeiBikou: string | null; // 寄附合計の備考
}
