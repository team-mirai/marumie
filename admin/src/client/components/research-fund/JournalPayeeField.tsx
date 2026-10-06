"use client";
import { useId, useState } from "react";
import { PayeeLinkDialog } from "@/client/components/research-fund/PayeeLinkDialog";
import { Button, Checkbox, Label } from "@/client/components/ui";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  withSameDocumentEntries,
  type Payee,
  type PayeeFormInput,
  type PayeeLinkSource,
} from "@/server/contexts/research-fund/domain/models/payee";

const linkSources: Record<PayeeLinkSource, string> = {
  manual: "手動で紐づけ",
  rule: "ルール照合で紐づけ",
  ai: "AIで紐づけ",
};

/**
 * 1 件の支出の支払先（支出を受けた者）を表示し、紐づけ・変更・解除する欄。
 *
 * 支払先は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中の仕訳でも変更できる
 * （仕訳の編集フォームとは別に保存する）。1 枚の書類の発行元は 1 者なので、
 * 同じ書類から作られた仕訳があれば既定でまとめて同じ支払先に紐づける。
 */
export function JournalPayeeField({
  entry,
  entries,
  payees,
  pending,
  onLink,
  onCreate,
}: {
  entry: ReviewEntry;
  /** 帳簿の全仕訳（同じ書類の仕訳を探す） */
  entries: readonly ReviewEntry[];
  /** 帳簿の議員の支払先 */
  payees: readonly Payee[];
  pending: boolean;
  onLink: (targets: readonly ReviewEntry[], payeeId: string | null) => void;
  onCreate: (targets: readonly ReviewEntry[], input: PayeeFormInput) => void;
}) {
  const fieldId = useId();
  const [linking, setLinking] = useState(false);
  const [sameDocument, setSameDocument] = useState(true);
  const payee = payees.find((p) => p.id === entry.payeeId) ?? null;
  const siblings = withSameDocumentEntries([entry], entries);
  const targets = sameDocument ? siblings : [entry];
  return (
    <div className="mt-4 space-y-2 rounded-lg bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold">支払先</span>
        <span className="rounded-full border px-2 text-xs text-muted-foreground">公開されない</span>
      </div>
      {payee ? (
        <div className="text-sm">
          <p className="font-bold">{payee.name}</p>
          <p className="text-muted-foreground">
            {payee.postalCode && <span className="mr-2 font-latin">〒{payee.postalCode}</span>}
            {payee.address || "住所未入力"}
          </p>
          {payee.invoiceRegistrationNumber && (
            <p className="font-latin text-muted-foreground">{payee.invoiceRegistrationNumber}</p>
          )}
          {entry.payeeLinkSource && (
            <p className="mt-1 text-xs text-muted-foreground">
              {linkSources[entry.payeeLinkSource]}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm font-bold text-destructive">支払先が未設定です</p>
      )}
      {siblings.length > 1 && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${fieldId}-same-document`}
            checked={sameDocument}
            disabled={pending}
            onCheckedChange={() => setSameDocument((current) => !current)}
          />
          <Label htmlFor={`${fieldId}-same-document`} className="font-normal">
            同じ書類の仕訳（<span className="font-latin">{siblings.length}</span>
            件）にまとめて紐づける
          </Label>
        </div>
      )}
      <Button type="button" variant="outline" disabled={pending} onClick={() => setLinking(true)}>
        {payee ? "支払先を変更" : "支払先を選ぶ"}
      </Button>
      <PayeeLinkDialog
        // 開くたびに今の支払先から選び直せるよう、開閉で作り直す
        key={String(linking)}
        open={linking}
        onOpenChange={setLinking}
        description={
          targets.length > 1
            ? `同じ書類から作られた${targets.length}件の仕訳に同じ支払先を紐づけます。`
            : `「${entry.description}」に支払先を紐づけます。`
        }
        payees={payees}
        currentPayeeId={entry.payeeId}
        defaultSearchQuery={entry.description}
        pending={pending}
        onLink={(payeeId) => onLink(targets, payeeId)}
        onCreate={(input) => onCreate(targets, input)}
      />
    </div>
  );
}
