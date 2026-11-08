"use server";

import "server-only";

import {
  buildResearchFundCsv,
  buildResearchFundCsvFilename,
} from "@/server/contexts/research-fund/domain/services/research-fund-csv";
import { loadResearchFundPageByPath } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page-by-path";

interface DownloadResearchFundCsvResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}

/**
 * 議員ページの出入金（支給と支出）を CSV にして返す。
 *
 * 画面が読むのと同じ loader を使うので、published の支給と支出だけが対象になり、
 * 備考（memo）や未公開の仕訳は含まれない。
 * 調研費を「公開しない」議員は、ページと同じくプレビュー用の文字列を含む slug の区間（pathSlug）でなければ返さない。
 */
export async function downloadResearchFundCsv(
  pathSlug: string,
  financialYear: number,
): Promise<DownloadResearchFundCsvResult> {
  try {
    const page = await loadResearchFundPageByPath({ pathSlug, financialYear });
    if (!page) {
      return { success: false, error: "公開中のデータが見つかりませんでした" };
    }

    return {
      success: true,
      data: buildResearchFundCsv(page.data.expenses),
      filename: buildResearchFundCsvFilename(page.data.politician.slug, financialYear),
    };
  } catch (error) {
    console.error("Research fund CSV download error:", error);
    return { success: false, error: "CSVのダウンロードに失敗しました" };
  }
}
