"use client";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button, Label, Switch, Textarea } from "@/client/components/ui";
import { RESEARCH_FUND_COMING_SOON_NOTE_MAX_LENGTH } from "@/shared/models/politician";
import { setPoliticianResearchFundComingSoon } from "@/server/contexts/shared/presentation/actions/manage-politician";

/**
 * 調研費を非公開のまま、まる見えの議員一覧（トップ・メニュー・フッター・「他の議員」）に「準備中」としてグレーで出す設定。
 * 添え書き（例: 「〇〇議員室は業務逼迫のため、12月中旬を目処に公開予定です。」）はトップの点線の枠に出る。
 * 公開するかと同じく運営が決めるので admin にだけ出す。
 */
export function ResearchFundComingSoonForm({
  id,
  comingSoonNote,
}: {
  id: string;
  comingSoonNote: string | null;
}) {
  const router = useRouter();
  const switchId = useId();
  const noteId = useId();
  const [enabled, setEnabled] = useState(comingSoonNote !== null);
  const [note, setNote] = useState(comingSoonNote ?? "");
  const [busy, setBusy] = useState(false);
  const dirty =
    enabled !== (comingSoonNote !== null) || (enabled && note !== (comingSoonNote ?? ""));

  const save = async (nextEnabled: boolean, nextNote: string) => {
    setBusy(true);
    try {
      const result = await setPoliticianResearchFundComingSoon(id, nextEnabled ? nextNote : null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.cacheWarning)
        toast.warning(`保存しましたが、まる見えの更新に失敗しました: ${result.cacheWarning}`);
      else toast.success(nextEnabled ? "準備中として表示します" : "準備中の表示をやめました");
      router.refresh();
    } catch {
      toast.error("準備中の設定の変更に失敗しました。もう一度お試しください");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md bg-secondary p-3">
      <div className="flex items-center gap-2">
        <Switch
          id={switchId}
          checked={enabled}
          disabled={busy}
          onCheckedChange={(checked) => {
            setEnabled(checked);
            // 出さないに切り替えたときは添え書きの入力を待たずに保存する
            if (!checked) void save(false, note);
          }}
        />
        <Label htmlFor={switchId}>まる見えの一覧に「準備中」として出す</Label>
      </div>
      {enabled && (
        <div className="space-y-1.5">
          <Label htmlFor={noteId}>添え書き（任意）</Label>
          <p className="text-xs text-muted-foreground">
            トップと議員ページの「準備中」の枠に出ます
          </p>
          <Textarea
            id={noteId}
            value={note}
            maxLength={RESEARCH_FUND_COMING_SOON_NOTE_MAX_LENGTH}
            disabled={busy}
            placeholder="例: 〇〇議員室は業務逼迫のため、12月中旬を目処に公開予定です。"
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={busy || !dirty} onClick={() => save(true, note)}>
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
