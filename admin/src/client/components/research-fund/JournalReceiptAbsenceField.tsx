"use client";
import { useId, useState } from "react";
import { Button, Label, Textarea } from "@/client/components/ui";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  normalizeReceiptAbsenceReason,
  RECEIPT_ABSENCE_REASON_MAX_LENGTH,
} from "@/server/contexts/research-fund/domain/models/receipt-absence";

/**
 * 書類の無い支出に、領収書等を徴し難かった事情を書く・直す・消す欄。
 *
 * 事情は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中の仕訳でも変更できる
 * （仕訳の編集フォームとは別に保存する）。書類のある仕訳には出さない（domain/models/receipt-absence）。
 */
export function JournalReceiptAbsenceField({
  entry,
  pending,
  onSave,
}: {
  entry: ReviewEntry;
  pending: boolean;
  onSave: (reason: string) => void;
}) {
  const fieldId = useId();
  const [value, setValue] = useState(entry.receiptAbsenceReason ?? "");
  const unchanged = normalizeReceiptAbsenceReason(value) === entry.receiptAbsenceReason;
  return (
    <div className="mt-4 space-y-2 rounded-lg bg-background p-3">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${fieldId}-reason`}>領収書等を徴し難かった事情</Label>
        <span className="rounded-full border px-2 text-xs text-muted-foreground">公開されない</span>
      </div>
      {entry.receiptAbsenceReason === null && (
        <p className="text-sm font-bold text-destructive">書類も徴し難かった事情もありません</p>
      )}
      <Textarea
        id={`${fieldId}-reason`}
        maxLength={RECEIPT_ABSENCE_REASON_MAX_LENGTH}
        disabled={pending}
        value={value}
        placeholder="例: 自動券売機で購入したため"
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        議員課に提出する帳簿に記載します。空欄にして保存すると削除します。公開中の仕訳でも変更でき、公開ページの内容は変わりません。
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending || unchanged}
        onClick={() => onSave(value)}
      >
        事情を保存
      </Button>
    </div>
  );
}
