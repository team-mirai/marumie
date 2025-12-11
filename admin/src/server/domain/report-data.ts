/**
 * ReportData
 *
 * Aggregated data structure that holds all sections of the political fund report.
 * This is the intermediate representation built by the usecase/assemblers
 * and consumed by the serializers for XML output.
 */

import type { OtherIncomeSection } from "./converters/income-converter";

// ============================================================
// ReportData Interface
// ============================================================

/**
 * ReportData holds all the section data for generating the full XML report.
 * Each section corresponds to a form in the 政治資金収支報告書.
 *
 * Sections are optional because a report may only include specific sections.
 */
export interface ReportData {
  // 収入の部
  // SYUUSHI07_01: 個人からの寄附 (future)
  // SYUUSHI07_02: 法人その他の団体からの寄附 (future)
  // SYUUSHI07_03: 政治団体からの寄附 (future)
  // SYUUSHI07_04: 政治資金パーティー開催事業の収入 (future)
  // SYUUSHI07_05: 本部または支部からの交付金 (future)
  otherIncome?: OtherIncomeSection; // SYUUSHI07_06: その他の収入

  // 支出の部
  // SYUUSHI07_07: 人件費 (future)
  // SYUUSHI07_08: 光熱水費 (future)
  // SYUUSHI07_09: 備品・消耗品費 (future)
  // SYUUSHI07_10: 事務所費 (future)
  // SYUUSHI07_11: 組織活動費 (future)
  // SYUUSHI07_12: 選挙関係費 (future)
  // SYUUSHI07_13: 機関紙誌の発行その他の事業費 (future)
  // SYUUSHI07_14: 調査研究費 (future)
  // SYUUSHI07_15: 寄附・交付金 (future)
  // SYUUSHI07_16: その他の経常経費 (future)

  // 資産の部
  // SYUUSHI07_17: 土地 (future)
  // SYUUSHI07_18: 建物 (future)
  // SYUUSHI07_19: 動産 (future)
  // SYUUSHI07_20: 預金等 (future)

  // その他
  // SYUUSHI08: 資産等の状況 (future)
  // SYUUSHI08_02: 負債の状況 (future)
  // SYUUSHI_KIFUKOUJYO: 寄附控除 (future)
}

// ============================================================
// Factory / Builder (optional helper)
// ============================================================

/**
 * Creates an empty ReportData object.
 */
export function createEmptyReportData(): ReportData {
  return {};
}
