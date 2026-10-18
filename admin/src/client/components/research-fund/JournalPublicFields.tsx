"use client";
import type { ReactNode } from "react";
import { GlobeSimple, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { Input, Label, NativeSelect, Textarea } from "@/client/components/ui";
import { LegalCategoryLabel } from "@/client/components/research-fund/LegalCategoryLabel";
import { cn } from "@/client/lib";
import { MAX_JOURNAL_AMOUNT } from "@/server/contexts/research-fund/domain/models/journal-amount";
import {
  isAccountUnconfirmed,
  legalLabelOf,
  type JournalEdit,
  type ReviewAccount,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";

/** 詳細カードの行（ラベル 76px ＋ 値）。「事務所内の管理」の行は右端に操作の列を足す */
export const detailRowClassName = "grid grid-cols-[76px_minmax(0,1fr)] items-center gap-2.5";
export const detailLabelClassName = "text-[11.5px] font-normal text-muted-foreground";
const inputClassName = "h-8 text-[12.5px] md:text-[12.5px]";
const changedClassName = "border-[1.5px] border-primary";

/** 支給日はその支給の月の中でだけ動かせる。当選月の下限（当選日）はサーバーで検証する。 */
function monthRange(entryDate: string) {
  const [year, month] = entryDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = entryDate.slice(0, 7);
  return {
    min: `${prefix}-01`,
    max: `${prefix}-${String(lastDay).padStart(2, "0")}`,
  };
}

const dotted = (isoDate: string) => isoDate.replaceAll("-", ".");
const yen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;

/** 入力欄の右上に重ねる「変更あり」。保存済みの値と違う欄に付ける */
function Changed({ changed, children }: { changed: boolean; children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      {children}
      {changed && (
        <span className="pointer-events-none absolute -top-1.5 right-2 bg-card px-1 text-[10px] leading-none font-bold text-primary-hover">
          変更あり
        </span>
      )}
    </div>
  );
}

function ReadRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn(detailRowClassName, "border-b border-border-soft py-1.5")}>
      <span className={detailLabelClassName}>{label}</span>
      <div className="min-w-0 text-[13px] break-words">{children}</div>
    </div>
  );
}

/**
 * 詳細カードの「公開される内容」（日付・金額・項目名・科目・特記事項）。
 * 公開中は読み取り表示、下書き・確認済は同じ並びの入力欄にする。
 * 支給は日付だけ、精算済は金額以外を入力欄にする（精算した額と記録が合わなくなるため）。
 */
export function JournalPublicFields({
  fieldId,
  entry,
  input,
  accounts,
  year,
  readOnly,
  onChange,
}: {
  fieldId: string;
  /** 編集中の仕訳。新規作成では null（「変更あり」を付けない） */
  entry: ReviewEntry | null;
  input: JournalEdit;
  accounts: ReviewAccount[];
  year: number;
  readOnly: boolean;
  onChange: <K extends keyof JournalEdit>(key: K, value: JournalEdit[K]) => void;
}) {
  const grant = entry?.source === "grant";
  const settled = entry != null && entry.settledAt !== null;
  const accountLabel = accounts.find((a) => a.key === input.accountKey)?.label;
  const changed = (key: keyof JournalEdit) => entry !== null && input[key] !== entry[key];
  const legalLabel = <LegalCategoryLabel legalLabel={legalLabelOf(accounts, input.accountKey)} />;
  return (
    <section aria-labelledby={`${fieldId}-public`} className="space-y-1.5">
      <h3
        id={`${fieldId}-public`}
        className="flex items-center gap-1 text-[11px] font-bold tracking-[0.06em] text-primary-hover"
      >
        <GlobeSimple aria-hidden className="size-[13px]" />
        公開される内容
      </h3>
      {readOnly ? (
        <div>
          <ReadRow label="日付">
            <span className="font-latin">{dotted(input.entryDate)}</span>
          </ReadRow>
          <ReadRow label="金額">
            <span className="font-latin">{yen(input.amount)}</span>
          </ReadRow>
          <ReadRow label="項目名">{input.description}</ReadRow>
          {!grant && (
            <>
              <ReadRow label="科目">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span>{accountLabel ?? "要確認"}</span>
                  {legalLabel}
                </span>
              </ReadRow>
              <ReadRow label="特記事項">
                {input.note ? (
                  <span className="whitespace-pre-wrap">{input.note}</span>
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )}
              </ReadRow>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-[76px_minmax(0,1fr)_36px_120px] items-center gap-2.5">
            <Label htmlFor={`${fieldId}-date`} className={detailLabelClassName}>
              日付
            </Label>
            <Changed changed={changed("entryDate")}>
              <Input
                id={`${fieldId}-date`}
                type="date"
                required
                min={grant && entry ? monthRange(entry.entryDate).min : `${year}-01-01`}
                max={grant && entry ? monthRange(entry.entryDate).max : `${year}-12-31`}
                value={input.entryDate}
                className={cn(
                  inputClassName,
                  "font-latin",
                  changed("entryDate") && changedClassName,
                )}
                onChange={(e) => onChange("entryDate", e.target.value)}
              />
            </Changed>
            {grant || settled ? (
              <>
                <span className={detailLabelClassName}>金額</span>
                <span
                  className="flex items-center justify-end gap-1 font-latin text-[13px]"
                  title={
                    settled
                      ? "精算済の仕訳は金額を変更できません。先に未精算に戻してください"
                      : undefined
                  }
                >
                  {yen(input.amount)}
                  {settled && <LockSimple aria-label="変更できません" className="size-3.5" />}
                </span>
              </>
            ) : (
              <>
                <Label htmlFor={`${fieldId}-amount`} className={detailLabelClassName}>
                  金額
                </Label>
                <Changed changed={changed("amount")}>
                  <Input
                    id={`${fieldId}-amount`}
                    type="number"
                    min="1"
                    max={MAX_JOURNAL_AMOUNT}
                    step="1"
                    required
                    value={input.amount || ""}
                    className={cn(
                      inputClassName,
                      "text-right font-latin",
                      changed("amount") && changedClassName,
                    )}
                    onChange={(e) => onChange("amount", Number(e.target.value))}
                  />
                </Changed>
              </>
            )}
          </div>
          {grant ? (
            <>
              <p className="pl-[86px] text-[11px] text-muted-foreground">
                支給日はその月の中の日付だけを指定できます（当選月は当選日以降）
              </p>
              <ReadRow label="項目名">{input.description}</ReadRow>
            </>
          ) : (
            <>
              <div className={detailRowClassName}>
                <Label htmlFor={`${fieldId}-description`} className={detailLabelClassName}>
                  項目名
                </Label>
                <Changed changed={changed("description")}>
                  <Input
                    id={`${fieldId}-description`}
                    required
                    maxLength={255}
                    value={input.description}
                    className={cn(inputClassName, changed("description") && changedClassName)}
                    onChange={(e) => onChange("description", e.target.value)}
                  />
                </Changed>
              </div>
              <div className={cn(detailRowClassName, "items-start")}>
                <Label htmlFor={`${fieldId}-account`} className={cn(detailLabelClassName, "pt-2")}>
                  科目
                </Label>
                <div className="min-w-0 space-y-1">
                  <Changed changed={changed("accountKey")}>
                    <NativeSelect
                      id={`${fieldId}-account`}
                      required
                      value={input.accountKey}
                      className={cn(inputClassName, changed("accountKey") && changedClassName)}
                      wrapperClassName="w-full"
                      onChange={(e) => onChange("accountKey", e.target.value)}
                    >
                      <option value="">科目を選択</option>
                      {accounts.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Changed>
                  <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                    {legalLabel}
                  </p>
                  {isAccountUnconfirmed(input.accountKey) && (
                    <p className="text-xs font-bold text-destructive">
                      要確認：科目を確定してください
                    </p>
                  )}
                </div>
              </div>
              <div className={cn(detailRowClassName, "items-start")}>
                <Label htmlFor={`${fieldId}-note`} className={cn(detailLabelClassName, "pt-2")}>
                  特記事項
                </Label>
                <Changed changed={changed("note")}>
                  <Textarea
                    id={`${fieldId}-note`}
                    value={input.note}
                    className={cn(
                      "h-12 min-h-12 resize-y text-[12.5px] md:text-[12.5px]",
                      changed("note") && changedClassName,
                    )}
                    onChange={(e) => onChange("note", e.target.value)}
                  />
                </Changed>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
