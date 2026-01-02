"use client";
import "client-only";

import { useState } from "react";
import { downloadTransactionsCsv } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-for-csv";

interface CsvDownloadLinkProps {
  slug: string;
  className?: string;
  children?: React.ReactNode;
  loadingText?: string;
}

export default function CsvDownloadLink({
  slug,
  className = "",
  children = "出入金履歴をCSVでダウンロード",
  loadingText = "ダウンロード中...",
}: CsvDownloadLinkProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const result = await downloadTransactionsCsv(slug);

      if (result.success && result.data) {
        // BOMを追加してUTF-8で保存
        const blob = new Blob([`\uFEFF${result.data}`], {
          type: "text/csv;charset=utf-8;",
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || "transactions.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert(result.error || "ダウンロードに失敗しました");
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
      className={`disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ fontFamily: "Noto Sans JP" }}
    >
      {isDownloading ? loadingText : children}
    </button>
  );
}
