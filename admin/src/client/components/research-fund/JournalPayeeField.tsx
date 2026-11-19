"use client";
import { useId, useState } from "react";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { JournalOfficeRow, TextButton } from "@/client/components/research-fund/JournalOfficeRow";
import { detailLabelClassName } from "@/client/components/research-fund/JournalPublicFields";
import { PayeeLinkDialog } from "@/client/components/research-fund/PayeeLinkDialog";
import { Button, Checkbox, Label } from "@/client/components/ui";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import {
  payeeFormInputFromIssuer,
  payeeSearchQueryFromEntries,
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
 * 詳細カードの「事務所内の管理」の支払先の行。支払先（支出を受けた者）を表示し、紐づけ・変更・解除する。
 *
 * 支払先は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中の仕訳でも変更でき、
 * 仕訳の編集フォームとは別にすぐ保存する。1 枚の書類の発行元は 1 者なので、
 * 同じ書類から作られた仕訳があれば既定でまとめて同じ支払先に紐づける。
 * 支払先が未設定で書類から発行元が読み取れていれば、その内容で支払先を作って紐づけられる。
 */
export function JournalPayeeField({
  entry,
  entries,
  payees,
  target,
  payeesPath,
  allowLeave,
  pending,
  onLink,
  onCreate,
}: {
  entry: ReviewEntry;
  /** 帳簿の全仕訳（同じ書類の仕訳を探す） */
  entries: readonly ReviewEntry[];
  /** 帳簿の議員の支払先 */
  payees: readonly Payee[];
  /** 支払先を新規作成するときの住所検索に使う帳簿の議員 */
  target: Pick<Extract<AdminTarget, { kind: "research-fund" }>, "politicianId" | "bookId">;
  /** 支払先の一覧ページのパス。支払先の詳細ページへのリンクに使う */
  payeesPath: string;
  /** 編集中の変更を破棄して画面を離れてよいか（支払先の詳細ページへ移る前に確かめる） */
  allowLeave: () => boolean;
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
  const issuer = entry.issuer;
  return (
    <JournalOfficeRow
      label={<span className={detailLabelClassName}>支払先</span>}
      action={
        payee ? (
          <TextButton aria-label="支払先を変更" disabled={pending} onClick={() => setLinking(true)}>
            変更
          </TextButton>
        ) : (
          <>
            {issuer?.name && (
              <Button
                type="button"
                size="xs"
                className="text-[11.5px]"
                disabled={pending}
                onClick={() => onCreate(targets, payeeFormInputFromIssuer(issuer))}
              >
                発行元で作成
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="text-[11.5px]"
              aria-label="支払先を選ぶ"
              disabled={pending}
              onClick={() => setLinking(true)}
            >
              選ぶ
            </Button>
          </>
        )
      }
      below={
        siblings.length > 1 && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${fieldId}-same-document`}
              checked={sameDocument}
              disabled={pending}
              onCheckedChange={() => setSameDocument((current) => !current)}
            />
            <Label htmlFor={`${fieldId}-same-document`} className="text-[11px] font-normal">
              同じ書類の<span className="font-latin">{siblings.length}</span>
              件にもまとめて紐づける
            </Label>
          </div>
        )
      }
    >
      {payee ? (
        <p
          title={[
            payee.postalCode ? `〒${payee.postalCode}` : "",
            payee.address || "住所未入力",
            payee.invoiceRegistrationNumber ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Link
            href={`${payeesPath}/${payee.id}`}
            onClick={(event) => {
              if (!allowLeave()) event.preventDefault();
            }}
            className="font-bold text-primary-active hover:underline"
          >
            {payee.name}
          </Link>
          {entry.payeeLinkSource && (
            <span className="ml-1.5 text-[11px] text-subtle-foreground">
              {linkSources[entry.payeeLinkSource]}
            </span>
          )}
        </p>
      ) : (
        <>
          <p className="flex items-center gap-1 font-bold text-destructive">
            <WarningCircle aria-hidden className="size-3.5" />
            未設定
          </p>
          {issuer?.name && (
            <p
              className="text-[11px] text-muted-foreground"
              title={[issuer.address, issuer.phone && `TEL ${issuer.phone}`]
                .filter(Boolean)
                .join(" ")}
            >
              書類の発行元：{issuer.name}
              {issuer.invoice_registration_number && (
                <span className="font-latin">（{issuer.invoice_registration_number}）</span>
              )}
            </p>
          )}
        </>
      )}
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
        target={target}
        defaultSearchQuery={payeeSearchQueryFromEntries([entry])}
        pending={pending}
        onLink={(payeeId) => onLink(targets, payeeId)}
        onCreate={(input) => onCreate(targets, input)}
      />
    </JournalOfficeRow>
  );
}
