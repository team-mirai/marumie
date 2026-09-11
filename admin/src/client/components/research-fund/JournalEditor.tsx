"use client";
import { useId, useState } from "react";
import { Button, Input, Label, NativeSelect, Textarea } from "@/client/components/ui";
import type {
  JournalEdit,
  ReviewAccount,
  ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";

export function JournalEditor({
  entry,
  accounts,
  year,
  documentUrl,
  pending,
  onSave,
  onDiscard,
}: {
  entry: ReviewEntry | null;
  accounts: ReviewAccount[];
  year: number;
  documentUrl?: string;
  pending: boolean;
  onSave: (input: JournalEdit, approve: boolean) => void;
  onDiscard: () => void;
}) {
  const fieldId = useId();
  const [input, setInput] = useState<JournalEdit>(
    entry ?? {
      entryDate: `${year}-01-01`,
      amount: 1,
      description: "",
      accountKey: "",
      note: "",
      memo: "",
    },
  );
  const [dirty, setDirty] = useState(false);
  const published = entry?.status === "published";
  function change<K extends keyof JournalEdit>(key: K, value: JournalEdit[K]) {
    setDirty(true);
    setInput((old) => ({ ...old, [key]: value }));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(input, false);
      }}
      className="space-y-4"
      data-journal-dirty={dirty}
    >
      {documentUrl ? (
        <div className="space-y-2">
          <iframe
            key={documentUrl}
            title="領収書プレビュー"
            src={documentUrl}
            className="h-72 w-full rounded-lg border bg-background"
          />
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-active underline"
          >
            原寸で開く
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          領収書なし（手動作成）
        </div>
      )}
      {published && (
        <p className="text-sm font-bold text-primary-active">公開中の仕訳は編集・破棄できません</p>
      )}
      <fieldset disabled={pending || published} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${fieldId}-date`}>日付</Label>
            <Input
              id={`${fieldId}-date`}
              type="date"
              required
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              value={input.entryDate}
              onChange={(e) => change("entryDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${fieldId}-amount`}>金額</Label>
            <Input
              id={`${fieldId}-amount`}
              type="number"
              min="1"
              max="999999999999"
              step="1"
              required
              value={input.amount || ""}
              onChange={(e) => change("amount", Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${fieldId}-description`}>項目名</Label>
          <Input
            id={`${fieldId}-description`}
            required
            maxLength={255}
            value={input.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${fieldId}-account`}>科目</Label>
          <NativeSelect
            id={`${fieldId}-account`}
            required
            value={input.accountKey}
            onChange={(e) => change("accountKey", e.target.value)}
            wrapperClassName="w-full"
          >
            <option value="">科目を選択</option>
            {accounts.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </NativeSelect>
          {input.accountKey === "needs-review" && (
            <p className="text-sm font-bold text-destructive">要確認：科目を確定してください</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          複式の仕訳（借方 {accounts.find((a) => a.key === input.accountKey)?.label ?? "科目"}／貸方
          普通預金）は自動で作られます
        </p>
        <div>
          <Label htmlFor={`${fieldId}-note`}>特記事項（公開される）</Label>
          <Textarea
            id={`${fieldId}-note`}
            value={input.note}
            onChange={(e) => change("note", e.target.value)}
          />
        </div>
        <div className="rounded-lg bg-background p-3">
          <div className="mb-2 flex items-center gap-2">
            <Label htmlFor={`${fieldId}-memo`}>備考</Label>
            <span className="rounded-full border px-2 text-xs text-muted-foreground">
              公開されない
            </span>
          </div>
          <Textarea
            id={`${fieldId}-memo`}
            value={input.memo}
            onChange={(e) => change("memo", e.target.value)}
          />
        </div>
        {!published && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant={entry ? "outline" : "default"}>
              {entry ? "保存" : "下書きを作成"}
            </Button>
            {entry?.status === "draft" && (
              <Button
                type="submit"
                disabled={input.accountKey === "needs-review"}
                onClick={(e) => {
                  if (e.currentTarget.form?.reportValidity()) {
                    e.preventDefault();
                    onSave(input, true);
                  }
                }}
              >
                確認済にする
              </Button>
            )}
            {entry && (
              <Button type="button" variant="destructive" onClick={onDiscard}>
                破棄
              </Button>
            )}
          </div>
        )}
      </fieldset>
      <p className="border-t border-border-soft pt-3 text-xs text-muted-foreground">
        source: {entry?.source ?? "manual"} ／ モデル: {entry?.model ?? "—"} ／ プロンプト版:{" "}
        {entry?.promptVersion ?? "—"}
      </p>
    </form>
  );
}
