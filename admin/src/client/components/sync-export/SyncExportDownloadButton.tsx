"use client";
import "client-only";

import { useTransition } from "react";
import { CircleNotch, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/client/components/ui";
import { apiClient } from "@/client/lib/api-client";
import { saveBlobAsFile } from "@/client/lib";

interface SyncExportDownloadButtonProps {
  politicalOrganizationId: string;
}

export function SyncExportDownloadButton({
  politicalOrganizationId,
}: SyncExportDownloadButtonProps) {
  const [isDownloading, startDownloadTransition] = useTransition();

  function handleDownload() {
    startDownloadTransition(async () => {
      try {
        const { blob, filename } =
          await apiClient.downloadOrganizationSync(politicalOrganizationId);

        saveBlobAsFile(blob, filename || `marumie-sync_${politicalOrganizationId}.json`);

        toast.success("同期用JSONをダウンロードしました");
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
      {isDownloading ? "書き出し中..." : "同期用JSONをダウンロード"}
    </Button>
  );
}
