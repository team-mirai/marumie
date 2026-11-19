/**
 * 政治資金報告書 XML のダウンロード時のファイル名を組み立てる。
 * 形式: report_{年度}_{団体スラッグ}_{出力日時 YYYYMMDD_HHMM}.xml
 * スラッグが無い団体は "unknown" とする。
 */
export function buildReportFilename(
  financialYear: number,
  slug: string | null,
  exportedAt: Date,
): string {
  const year = exportedAt.getFullYear();
  const month = String(exportedAt.getMonth() + 1).padStart(2, "0");
  const day = String(exportedAt.getDate()).padStart(2, "0");
  const hours = String(exportedAt.getHours()).padStart(2, "0");
  const minutes = String(exportedAt.getMinutes()).padStart(2, "0");
  const exportedDateTime = `${year}${month}${day}_${hours}${minutes}`;

  const orgSlug = slug ?? "unknown";
  return `report_${financialYear}_${orgSlug}_${exportedDateTime}.xml`;
}
