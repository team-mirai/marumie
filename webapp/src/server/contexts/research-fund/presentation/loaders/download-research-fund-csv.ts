"use server";

import "server-only";

import {
  buildResearchFundCsv,
  buildResearchFundCsvFilename,
} from "@/server/contexts/research-fund/domain/services/research-fund-csv";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";

interface DownloadResearchFundCsvResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

/**
 * 議員ページの支出を CSV にして返す。
 *
 * 画面が読むのと同じ loader を使うので、published の支出だけが対象になり、
 * 備考（memo）や未公開の仕訳は含まれない。
 */
export async function downloadResearchFundCsv(
  slug: string,
  financialYear: number,
): Promise<DownloadResearchFundCsvResult> {
  try {
    const data = await loadResearchFundPage({ slug, financialYear });
    if (!data) {
      return { success: false, error: "公開中のデータが見つかりませんでした" };
    }

    return {
      success: true,
      data: buildResearchFundCsv(data.expenses),
      filename: buildResearchFundCsvFilename(slug, financialYear),
    };
  } catch (error) {
    console.error("Research fund CSV download error:", error);
    return { success: false, error: "CSVのダウンロードに失敗しました" };
  }
}
