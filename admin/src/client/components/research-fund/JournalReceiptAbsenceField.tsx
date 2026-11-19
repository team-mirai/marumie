"use client";
import { useId } from "react";
import { PencilSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { JournalOfficeRow } from "@/client/components/research-fund/JournalOfficeRow";
import { detailLabelClassName } from "@/client/components/research-fund/JournalPublicFields";
import { Button, Checkbox, Label, Textarea } from "@/client/components/ui";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  normalizeReceiptAbsenceReason,
  RECEIPT_ABSENCE_REASON_MAX_LENGTH,
} from "@/server/contexts/research-fund/domain/models/receipt-absence";

/**
 * 詳細カードの「事務所内の管理」の徴難の行。支出の仕訳に徴難（領収書等を徴し難かった）を付ける・外す。
 *
 * 書類の有無とは独立に付けられる（振込明細はあるが領収書が無い支出など）。
 * 徴難は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中・精算済の仕訳でも変更でき、
 * チェックの操作だけで保存する（仕訳の編集フォームとは別）。外すと入力済みの事情も消えるので確認する。
 */
export function JournalReceiptAbsentField({
  entry,
  pending,
  onChange,
}: {
  entry: ReviewEntry;
  pending: boolean;
  onChange: (receiptAbsent: boolean) => void;
}) {
  const fieldId = useId();
  function change(checked: boolean) {
    if (
      !checked &&
      entry.receiptAbsenceReason !== null &&
      !window.confirm("徴難を外すと、入力済みの「徴し難かった事情」は消えます。外しますか？")
    )
      return;
    onChange(checked);
  }
  return (
    <JournalOfficeRow label={<span className={detailLabelClassName}>徴難</span>}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${fieldId}-absent`}
          checked={entry.receiptAbsent}
          disabled={pending}
          onCheckedChange={(checked) => change(checked === true)}
        />
        <Label
          htmlFor={`${fieldId}-absent`}
          title="議員課に提出する帳簿で、書類の有無にかかわらず「徴難」（参議院は領収書「無」）として出します"
          className="text-[12.5px] font-normal"
        >
          領収書等を徴し難かった
        </Label>
      </div>
    </JournalOfficeRow>
  );
}

/**
 * 詳細カードの「事務所内の管理」の書類の事情の行。徴難の支出に、領収書等を徴し難かった事情を書く・直す・消す。
 *
 * 事情は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中の仕訳でも変更でき、
 * 鉛筆で行を編集モードにして行ごとに保存する（仕訳の編集フォームとは別）。
 * 徴難でない仕訳には出さない（domain/models/receipt-absence）。
 */
export function JournalReceiptAbsenceField({
  entry,
  pending,
  editing,
  value,
  onChange,
  onEdit,
  onCancel,
  onSave,
}: {
  entry: ReviewEntry;
  pending: boolean;
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (reason: string) => void;
}) {
  const fieldId = useId();
  const unchanged = normalizeReceiptAbsenceReason(value) === entry.receiptAbsenceReason;
  return (
    <JournalOfficeRow
      label={
        editing ? (
          <Label htmlFor={`${fieldId}-reason`} className={detailLabelClassName}>
            書類の事情
          </Label>
        ) : (
          <span className={detailLabelClassName}>書類の事情</span>
        )
      }
      action={
        editing ? (
          <>
            <Button
              type="button"
              size="xs"
              aria-label="事情を保存"
              disabled={pending || unchanged}
              onClick={() => onSave(value)}
            >
              保存
            </Button>
            <Button type="button" variant="outline" size="xs" disabled={pending} onClick={onCancel}>
              キャンセル
            </Button>
          </>
        ) : (
          <button
            type="button"
            aria-label="書類の事情を編集"
            disabled={pending}
            onClick={onEdit}
            className="cursor-pointer rounded-sm text-primary-hover outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-disabled-foreground"
          >
            <PencilSimple aria-hidden className="size-[15px]" />
          </button>
        )
      }
    >
      {editing ? (
        <Textarea
          id={`${fieldId}-reason`}
          rows={2}
          maxLength={RECEIPT_ABSENCE_REASON_MAX_LENGTH}
          disabled={pending}
          value={value}
          placeholder="例: 自動券売機で購入したため"
          title="領収書等を徴し難かった事情。議員課に提出する帳簿に記載します。空欄にして保存すると削除します"
          className="min-h-12 border-disabled-border text-[12.5px] md:text-[12.5px]"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : entry.receiptAbsenceReason !== null ? (
        <span className="whitespace-pre-wrap">{entry.receiptAbsenceReason}</span>
      ) : (
        <span className="flex items-center gap-1 font-bold text-destructive">
          <WarningCircle aria-hidden className="size-3.5" />
          未入力
        </span>
      )}
    </JournalOfficeRow>
  );
}
