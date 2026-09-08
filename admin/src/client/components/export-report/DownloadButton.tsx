"use client";
import "client-only";

import { useTransition } from "react";
import { CircleNotch, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/client/components/ui";
import { apiClient } from "@/client/lib/api-client";

interface DownloadButtonProps {
  politicalOrganizationId: string;
  financialYear: number;
}

export function DownloadButton({ politicalOrganizationId, financialYear }: DownloadButtonProps) {
  const [isDownloading, startDownloadTransition] = useTransition();

  function handleDownload() {
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
        setTimeout(() => window.URL.revokeObjectURL(url), 100);

        toast.success("XMLファイルをダウンロードしました");
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "不明なエラーが発生しました");
      }
    });
  }

  return (
    <Button
      type="button"
      className="text-[13px] tracking-[0.06em]"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? <CircleNotch className="animate-spin" /> : <DownloadSimple />}
      {isDownloading ? "ダウンロード中..." : "XMLをダウンロード"}
    </Button>
  );
}
