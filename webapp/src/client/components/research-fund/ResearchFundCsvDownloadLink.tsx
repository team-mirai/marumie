"use client";
import "client-only";

import { useState } from "react";
import { downloadResearchFundCsv } from "@/server/contexts/research-fund/presentation/loaders/download-research-fund-csv";

interface Props {
  slug: string;
  financialYear: number;
  className?: string;
}

/**
 * B-4 の支出を CSV でダウンロードする。
 *
 * 画面は月ごとに区切って見せるが、CSV はその年度の公開中の支出を全件出す。
 */
export default function ResearchFundCsvDownloadLink({
  slug,
  financialYear,
  className = "",
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const result = await downloadResearchFundCsv(slug, financialYear);

      if (result.success && result.data) {
        // Excel が文字化けしないよう UTF-8 BOM を付ける（既存の取引 CSV と同じ）
        const blob = new Blob([`\uFEFF${result.data}`], {
          type: "text/csv;charset=utf-8;",
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename ?? "research_fund.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert(result.error ?? "ダウンロードに失敗しました");
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("ダウンロードに失敗しました");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={`cursor-pointer rounded-md bg-white px-4 py-3 text-sm font-bold text-[#238778] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isDownloading ? "ダウンロード中..." : "すべての支出をCSVでダウンロード"}
    </button>
  );
}
