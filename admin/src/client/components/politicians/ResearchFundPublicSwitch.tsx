"use client";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Label, Switch } from "@/client/components/ui";
import { setPoliticianResearchFundPublic } from "@/server/contexts/shared/presentation/actions/manage-politician";

/**
 * 議員ごとに調研費を「公開する／公開しない」を切り替える。
 * 公開しない議員のページはプレビュー URL（推測できない文字列を含む）でだけ開け、まる見えの導線・sitemap には出ず noindex になる。
 * 公開するかは運営が決めるので、admin にだけ出す（admin 以外には公開状態のバッジだけを出す。#1894, #1899）。
 */
export function ResearchFundPublicSwitch({
  id,
  isResearchFundPublic,
}: {
  id: string;
  isResearchFundPublic: boolean;
}) {
  const router = useRouter();
  const switchId = useId();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={switchId}
        checked={isResearchFundPublic}
        disabled={busy}
        onCheckedChange={async (checked) => {
          setBusy(true);
          try {
            const result = await setPoliticianResearchFundPublic(id, checked);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            if (result.cacheWarning)
              toast.warning(
                `切り替えましたが、まる見えの更新に失敗しました: ${result.cacheWarning}`,
              );
            else toast.success(checked ? "調研費を公開しました" : "調研費を非公開にしました");
            router.refresh();
          } catch {
            toast.error("公開設定の変更に失敗しました。もう一度お試しください");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Label htmlFor={switchId}>公開する</Label>
    </div>
  );
}
