"use client";
import "client-only";

import { useState, useTransition } from "react";
import { Button } from "@/client/components/ui";
import { apiClient } from "@/client/lib/api-client";

interface DownloadButtonProps {
  politicalOrganizationId: string;
  financialYear: number;
}

export function DownloadButton({ politicalOrganizationId, financialYear }: DownloadButtonProps) {
  const [isDownloading, startDownloadTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleDownload() {
    setStatus(null);
    startDownloadTransition(async () => {
      try {
        const { blob, filename } = await apiClient.downloadReport({
          politicalOrganizationId,
          financialYear: financialYear.toString(),
          sections: ["SYUUSHI07_06"],
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || `marumie_xml_${politicalOrganizationId}_${financialYear}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setStatus({
          type: "success",
          message: "XMLファイルをダウンロードしました",
        });
      } catch (error) {
        console.error(error);
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "不明なエラーが発生しました",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button type="button" onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? "ダウンロード中..." : "Shift_JISでダウンロード"}
      </Button>

      {status && (
        <div
          className={`rounded-lg px-3 py-2 ${
            status.type === "error"
              ? "bg-red-500/20 text-red-200"
              : "bg-green-500/20 text-green-200"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
