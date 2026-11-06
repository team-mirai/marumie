"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label, Switch } from "@/client/components/ui";
import { LegalCategoryOverridePolicy } from "@/server/contexts/research-fund/domain/models/legal-category-override";
import { setLegalCategoryOverrideAllowed } from "@/server/contexts/research-fund/presentation/actions/manage-book";

/**
 * 帳簿ごとに、仕訳の法定区分の上書きを許可・取り消しする（#1880）。管理者（admin）にだけ出す。
 * まる見え導入前に報告書を提出済みの年度の帳簿で、提出済みの区分に合わせるためだけに許可する。
 * 上書き中の仕訳が残っている間は取り消せない（スイッチを無効にして理由を出す。サーバー側でも拒否する）。
 */
export function LegalCategoryOverrideSwitch({
  politicianId,
  bookId,
  allowed,
  count,
}: {
  politicianId: string;
  bookId: string;
  allowed: boolean;
  /** 上書き中の仕訳の件数 */
  count: number;
}) {
  const router = useRouter();
  const switchId = useId();
  const [busy, setBusy] = useState(false);
  const revocationRejection = allowed
    ? LegalCategoryOverridePolicy.revocationRejection(count)
    : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Switch
          id={switchId}
          checked={allowed}
          disabled={busy || revocationRejection !== null}
          onCheckedChange={async (checked) => {
            if (
              checked &&
              !window.confirm(
                "この帳簿で、仕訳ごとに法定区分を上書きできるようにします。提出済みの報告書の区分に合わせる場合だけ許可してください。許可しますか？",
              )
            )
              return;
            setBusy(true);
            try {
              const result = await setLegalCategoryOverrideAllowed(politicianId, bookId, checked);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success(
                checked
                  ? "法定区分の上書きを許可しました"
                  : "法定区分の上書きの許可を取り消しました",
              );
              router.refresh();
            } catch {
              toast.error("法定区分の上書きの許可を変更できませんでした。もう一度お試しください");
            } finally {
              setBusy(false);
            }
          }}
        />
        <Label htmlFor={switchId} className="text-sm">
          法定区分の上書きを許可する
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        許可すると、仕訳ごとに法律上の区分を科目の既定と違う区分に指定できます（理由の入力が必須）。
        {allowed && `上書き中の仕訳：${count}件`}
      </p>
      {revocationRejection && (
        <p role="note" className="text-xs font-bold text-destructive">
          {revocationRejection}
        </p>
      )}
    </div>
  );
}
