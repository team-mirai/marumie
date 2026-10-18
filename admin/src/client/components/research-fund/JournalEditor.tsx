"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Info, LockKey, LockSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { Button, Input, Label } from "@/client/components/ui";
import { JournalAdvanceField } from "@/client/components/research-fund/JournalAdvanceField";
import { JournalDocumentPreview } from "@/client/components/research-fund/JournalDocumentPreview";
import { JournalOfficeRow, TextButton } from "@/client/components/research-fund/JournalOfficeRow";
import { JournalPayeeField } from "@/client/components/research-fund/JournalPayeeField";
import {
  detailLabelClassName,
  JournalPublicFields,
} from "@/client/components/research-fund/JournalPublicFields";
import {
  JournalReceiptAbsenceField,
  JournalReceiptAbsentField,
} from "@/client/components/research-fund/JournalReceiptAbsenceField";
import { useResearchFundReadOnly } from "@/client/components/research-fund/ResearchFundWriteAccess";
import { cn } from "@/client/lib";
import { normalizeAdvancedBy } from "@/server/contexts/research-fund/domain/models/advance";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import {
  isAccountUnconfirmed,
  type JournalEdit,
  type ReviewAccount,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { Payee, PayeeFormInput } from "@/server/contexts/research-fund/domain/models/payee";
import {
  canHaveReceiptAbsenceReason,
  canMarkReceiptAbsent,
} from "@/server/contexts/research-fund/domain/models/receipt-absence";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

/** 閲覧時に鉛筆で編集モードにする行（同時に開くのは 1 行だけ） */
type EditingRow = "advance" | "receiptAbsence";

/**
 * 仕訳の詳細カードの本文とフッター。本文だけをスクロールさせ、フッターは固定する。
 *
 * 本文は「公開される内容」と「事務所内の管理」の 2 つのグループに分ける。
 * - 公開中：公開される内容は読み取り表示。フッターの代わりに source を固定で出す
 * - 下書き・確認済：公開される内容は入力欄。フッターの保存で、日付〜備考と、変えた立替者を一緒に送る
 * 事務所内の管理（支払先・立替者・徴難・書類の事情）は公開内容を変えないので、公開中でも行ごとに変更できる。
 */
export function JournalEditor({
  entry,
  entries,
  accounts,
  advancers,
  payees,
  target,
  documentUrl,
  banner,
  pending: busy,
  allowLeave,
  onSave,
  onDiscard,
  onUnpublish,
  onRevertToDraft,
  onSetAdvancedBy,
  onSettle,
  onUnsettle,
  onSetReceiptAbsent,
  onSaveReceiptAbsenceReason,
  onAttachDocument,
  onLinkPayee,
  onCreatePayee,
}: {
  entry: ReviewEntry;
  /** 帳簿の全仕訳（同じ書類の仕訳を探す） */
  entries: readonly ReviewEntry[];
  accounts: ReviewAccount[];
  /** 同じ議員室で過去に入力された立替者（入力欄の候補） */
  advancers: readonly string[];
  payees: readonly Payee[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
  documentUrl?: string;
  /** 本文の先頭に出す警告（二重スキャンなど） */
  banner?: ReactNode;
  pending: boolean;
  /** 編集中の変更を破棄して画面を離れてよいか */
  allowLeave: () => boolean;
  /**
   * 仕訳を保存する（approve なら確認済にもする）。
   * advancedBy は編集ビューで立替者を変えたときだけ渡し、仕訳の保存が成功したあとに続けて送る。
   */
  onSave: (input: JournalEdit, approve: boolean, advancedBy: string | null) => void;
  onDiscard: () => void;
  onUnpublish: () => void;
  onRevertToDraft: () => void;
  onSetAdvancedBy: (advancedBy: string) => void;
  onSettle: (settledAt: string) => void;
  onUnsettle: () => void;
  /** 徴難を付ける・外す（外すと事情も消える） */
  onSetReceiptAbsent: (receiptAbsent: boolean) => void;
  onSaveReceiptAbsenceReason: (reason: string) => void;
  /** 書類の無い仕訳に、あとから領収書ファイルを紐づける */
  onAttachDocument: (file: File) => void;
  onLinkPayee: (targets: readonly ReviewEntry[], payeeId: string | null) => void;
  onCreatePayee: (targets: readonly ReviewEntry[], input: PayeeFormInput) => void;
}) {
  // 担当外の議員室は閲覧のみ。処理中と同じく、編集用の入力・ボタンをすべて無効にする
  const readOnly = useResearchFundReadOnly();
  const pending = busy || readOnly;
  const fieldId = useId();
  const [input, setInput] = useState<JournalEdit>(entry);
  const [advancedBy, setAdvancedBy] = useState(entry.advancedBy ?? "");
  // 公開される内容と備考は、触ったら未保存とみなす（現行どおり）
  const [edited, setEdited] = useState(false);
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null);
  const [rowDraft, setRowDraft] = useState("");
  const published = entry.status === "published";
  const grant = entry.source === "grant";
  // 精算済は、精算した額と記録が合わなくなるので金額・立替者を変更できず、破棄もできない。
  const settled = entry.settledAt !== null;
  // 編集ビューでは立替者を最初から入力欄にし、フッターの保存で仕訳と一緒に送る
  const advanceInForm = !published && !settled;
  // 立替者は元の値に戻せば未保存に数えない（戻したあとに精算・未精算に戻すなどを確認なしで送れるように）
  const advanceChanged =
    advanceInForm && !grant && normalizeAdvancedBy(advancedBy) !== entry.advancedBy;
  const dirty = edited || advanceChanged;
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  function change<K extends keyof JournalEdit>(key: K, value: JournalEdit[K]) {
    setEdited(true);
    setInput((old) => ({ ...old, [key]: value }));
  }
  function submit(approve: boolean) {
    onSave(input, approve, advanceChanged ? advancedBy : null);
  }
  const originalOf = (row: EditingRow) =>
    (row === "advance" ? entry.advancedBy : entry.receiptAbsenceReason) ?? "";
  function editRow(row: EditingRow | null) {
    if (
      editingRow !== null &&
      editingRow !== row &&
      rowDraft !== originalOf(editingRow) &&
      !window.confirm("編集中の内容を破棄しますか？")
    )
      return;
    setEditingRow(row);
    setRowDraft(row === null ? "" : originalOf(row));
  }
  const source = (
    <p className="flex items-center gap-1 text-[10.5px] text-subtle-foreground">
      <Info aria-hidden className="size-[13px] shrink-0" />
      {entry.source} ／ {entry.model ?? "—"} ／ プロンプト版 {entry.promptVersion ?? "—"}
    </p>
  );
  return (
    <form
      onSubmit={(e) => {
        // 支払先ダイアログ（ポータル）内のフォームの送信も React のツリーを伝ってくるので、自分の送信だけを扱う
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (!published) submit(false);
      }}
      className="flex min-h-0 flex-1 flex-col"
      data-journal-dirty={dirty}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3">
        {banner}
        <JournalDocumentPreview
          grant={grant}
          documentUrl={documentUrl}
          pending={pending}
          onAttach={JournalOperation.attachDocument(entry) === null ? onAttachDocument : undefined}
        />
        {published && (
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-[7px] text-xs">
            <LockSimple aria-hidden className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">公開中のため、公開される内容は編集できません</span>
            <TextButton className="underline" disabled={pending} onClick={onUnpublish}>
              確認済に戻す
            </TextButton>
          </div>
        )}
        <fieldset disabled={pending} className="min-w-0">
          <JournalPublicFields
            fieldId={fieldId}
            entry={entry}
            input={input}
            accounts={accounts}
            year={target.year}
            readOnly={published}
            onChange={change}
          />
        </fieldset>
        {!grant && (
          <section aria-labelledby={`${fieldId}-office`} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3
                id={`${fieldId}-office`}
                className="flex items-center gap-1 text-[11px] font-bold text-foreground"
              >
                <LockKey aria-hidden className="size-[13px]" />
                事務所内の管理
              </h3>
              <span
                title="支払先・立替者・徴難・書類の事情・備考は事務所内の管理と議員課に提出する帳簿に使う情報で、公開ページには出ません。支払先・立替者・徴難・書類の事情は公開中の仕訳でも変更できます"
                className="rounded-full border border-disabled-border px-1.5 text-[10px] leading-4 text-muted-foreground"
              >
                公開されない・公開中も編集可
              </span>
            </div>
            <JournalPayeeField
              entry={entry}
              entries={entries}
              payees={payees}
              target={target}
              payeesPath={`/politicians/${target.politicianId}/books/${target.bookId}/payees`}
              allowLeave={allowLeave}
              pending={pending}
              onLink={onLinkPayee}
              onCreate={onCreatePayee}
            />
            {advanceInForm ? (
              <JournalAdvanceField
                entry={entry}
                advancers={advancers}
                pending={pending}
                editing
                value={advancedBy}
                onChange={setAdvancedBy}
                onSettle={onSettle}
                onUnsettle={onUnsettle}
              />
            ) : (
              <JournalAdvanceField
                entry={entry}
                advancers={advancers}
                pending={pending}
                editing={editingRow === "advance"}
                value={rowDraft}
                onChange={setRowDraft}
                onEdit={() => editRow("advance")}
                onCancel={() => editRow(null)}
                onSave={onSetAdvancedBy}
                onSettle={onSettle}
                onUnsettle={onUnsettle}
              />
            )}
            {canMarkReceiptAbsent(entry) && (
              <JournalReceiptAbsentField
                entry={entry}
                pending={pending}
                // 徴難を外して保存できると編集フォームが作り直され、事情の下書きも閉じる。
                // 保存に失敗したときに下書きを失わないよう、ここでは閉じない
                onChange={onSetReceiptAbsent}
              />
            )}
            {canHaveReceiptAbsenceReason(entry) && (
              <JournalReceiptAbsenceField
                entry={entry}
                pending={pending}
                editing={editingRow === "receiptAbsence"}
                value={rowDraft}
                onChange={setRowDraft}
                onEdit={() => editRow("receiptAbsence")}
                onCancel={() => editRow(null)}
                onSave={onSaveReceiptAbsenceReason}
              />
            )}
            <JournalOfficeRow
              className="border-b-0"
              label={
                published ? (
                  <span className={detailLabelClassName}>備考</span>
                ) : (
                  <Label htmlFor={`${fieldId}-memo`} className={detailLabelClassName}>
                    備考
                  </Label>
                )
              }
            >
              {published ? (
                input.memo ? (
                  <span className="whitespace-pre-wrap">{input.memo}</span>
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )
              ) : (
                <Input
                  id={`${fieldId}-memo`}
                  disabled={pending}
                  value={input.memo}
                  placeholder="事務所内のメモ"
                  className={cn(
                    "h-[30px] border-disabled-border text-[12.5px] md:text-[12.5px]",
                    input.memo !== entry.memo && "border-[1.5px] border-primary",
                  )}
                  onChange={(e) => change("memo", e.target.value)}
                />
              )}
            </JournalOfficeRow>
          </section>
        )}
        {!published && <div className="mt-auto">{source}</div>}
      </div>
      {published ? (
        <div className="shrink-0 border-t border-border-soft px-3.5 py-2">{source}</div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-3.5 py-2.5">
          {!grant && !settled && (
            <TextButton
              className="inline-flex items-center gap-1 text-destructive"
              disabled={pending}
              onClick={onDiscard}
            >
              <Trash aria-hidden className="size-3.5" />
              破棄
            </TextButton>
          )}
          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-primary-hover">
                <span aria-hidden className="size-[7px] rounded-full bg-primary" />
                未保存の変更
              </span>
            )}
            <Button type="submit" variant="outline" className="text-[12.5px]" disabled={pending}>
              保存
            </Button>
            {entry.status === "draft" && (
              <Button
                type="submit"
                className="text-[12.5px]"
                disabled={pending || isAccountUnconfirmed(input.accountKey)}
                title={
                  isAccountUnconfirmed(input.accountKey) ? "科目を確定してください" : undefined
                }
                onClick={(e) => {
                  if (e.currentTarget.form?.reportValidity()) {
                    e.preventDefault();
                    submit(true);
                  }
                }}
              >
                確認済にする
              </Button>
            )}
            {entry.status === "approved" && !grant && !settled && (
              <Button
                type="button"
                variant="outline"
                className="text-[12.5px]"
                disabled={pending}
                onClick={onRevertToDraft}
              >
                下書きに戻す
              </Button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
