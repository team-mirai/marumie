"use client";
import "client-only";

import { useState, useTransition } from "react";
import { CircleNotch, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button, Checkbox } from "@/client/components/ui";
import { apiClient } from "@/client/lib/api-client";
import { saveBlobAsFile } from "@/client/lib";

interface ResearchFundSyncExportFormProps {
  politicians: { id: string; name: string; slug: string }[];
}

export function ResearchFundSyncExportForm({ politicians }: ResearchFundSyncExportFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, startDownloadTransition] = useTransition();

  const allSelected = politicians.length > 0 && selectedIds.size === politicians.length;

  function toggle(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(politicians.map((p) => p.id)) : new Set());
  }

  function handleDownload() {
    // 一覧の並びのまま送る（Set の追加順に左右されないようにする）
    const politicianIds = politicians.map((p) => p.id).filter((id) => selectedIds.has(id));

    startDownloadTransition(async () => {
      try {
        const { blob, filename } = await apiClient.downloadResearchFundSync(politicianIds);

        saveBlobAsFile(blob, filename || "marumie-research-fund-sync.json");

        toast.success("同期用JSONをダウンロードしました");
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "不明なエラーが発生しました");
      }
    });
  }

  if (politicians.length === 0) {
    return <p className="text-sm text-muted-foreground">議員が登録されていません</p>;
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border rounded-md border border-border">
        <div className="flex items-center gap-3 px-4 py-3 text-sm font-bold">
          <Checkbox
            id="research-fund-sync-select-all"
            checked={allSelected ? true : selectedIds.size > 0 ? "indeterminate" : false}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
          <label htmlFor="research-fund-sync-select-all" className="cursor-pointer">
            すべて選択
          </label>
        </div>
        {politicians.map((politician) => {
          const checkboxId = `research-fund-sync-politician-${politician.id}`;
          return (
            <div key={politician.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Checkbox
                id={checkboxId}
                checked={selectedIds.has(politician.id)}
                onCheckedChange={(checked) => toggle(politician.id, checked === true)}
              />
              <label htmlFor={checkboxId} className="flex cursor-pointer items-center gap-3">
                <span>{politician.name}</span>
                <span className="font-latin text-muted-foreground">{politician.slug}</span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">
          <span className="font-latin">{selectedIds.size}</span>件選択中
        </span>
        <Button
          type="button"
          className="text-[13px] tracking-[0.06em]"
          onClick={handleDownload}
          disabled={isDownloading || selectedIds.size === 0}
        >
          {isDownloading ? <CircleNotch className="animate-spin" /> : <DownloadSimple />}
          {isDownloading ? "書き出し中..." : "同期用JSONをダウンロード"}
        </Button>
      </div>
    </div>
  );
}
