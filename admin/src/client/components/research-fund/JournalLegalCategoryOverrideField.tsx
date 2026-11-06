"use client";
import { useId, useState } from "react";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { JournalOfficeRow, TextButton } from "@/client/components/research-fund/JournalOfficeRow";
import { detailLabelClassName } from "@/client/components/research-fund/JournalPublicFields";
import { Button, Label, NativeSelect, Textarea } from "@/client/components/ui";
import {
  legalLabelOf,
  type ReviewAccount,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH,
  type LegalCategoryOverrideInput,
  LegalCategoryOverridePolicy,
} from "@/server/contexts/research-fund/domain/models/legal-category-override";
import { buildLegalCategoryCatalog } from "@/shared/research-fund/legal-category";

/**
 * 詳細カードの「公開される内容」の、法定区分の上書きの行（#1880）。
 *
 * 管理者が上書きを許可した帳簿でだけ、支出の仕訳の法律上の区分を科目の既定と違う区分に指定できる（理由の入力が必須）。
 * 上書き中の仕訳では、上書きしていること・科目の既定の区分・指定した区分・理由を見せる。
 * 法律上の区分は公開ページにも出るので、公開中の仕訳では変更できない（確認済に戻してから変える）。
 * 仕訳の編集フォームとは別に、行ごとに保存する。科目は保存済みの科目の既定と比べる。
 */
export function JournalLegalCategoryOverrideField({
  entry,
  accounts,
  allowed,
  pending,
  onSave,
}: {
  entry: ReviewEntry;
  accounts: readonly ReviewAccount[];
  /** 帳簿で上書きが許可されているか */
  allowed: boolean;
  pending: boolean;
  /** 上書きを保存する。null なら上書きを外す */
  onSave: (override: LegalCategoryOverrideInput | null) => void;
}) {
  const fieldId = useId();
  const override = entry.legalCategoryOverride;
  const [editing, setEditing] = useState(false);
  const [legalCategoryKey, setLegalCategoryKey] = useState(override?.key ?? "");
  const [reason, setReason] = useState(override?.reason ?? "");
  const defaultLabel = legalLabelOf(accounts, entry.accountKey);
  const defaultKey = accounts.find((a) => a.key === entry.accountKey)?.legalCategoryKey ?? null;
  const rejection = LegalCategoryOverridePolicy.entryRejection(entry, allowed);
  // 法定区分を持たない科目（要確認など）の仕訳は上書きできない
  const editable = rejection === null && defaultKey !== null;
  const options = [...buildLegalCategoryCatalog(accounts).values()].filter(
    (category) => category.key !== defaultKey,
  );
  function cancel() {
    setEditing(false);
    setLegalCategoryKey(override?.key ?? "");
    setReason(override?.reason ?? "");
  }
  const unchanged =
    override !== null && override.key === legalCategoryKey && override.reason === reason.trim();
  return (
    <JournalOfficeRow
      className="border-b-0"
      label={
        editing ? (
          <Label htmlFor={`${fieldId}-category`} className={detailLabelClassName}>
            区分の上書き
          </Label>
        ) : (
          <span className={detailLabelClassName}>区分の上書き</span>
        )
      }
      action={
        editing ? (
          <>
            <Button
              type="button"
              size="xs"
              aria-label="上書きを保存"
              disabled={pending || !legalCategoryKey || !reason.trim() || unchanged}
              onClick={() => onSave({ legalCategoryKey, reason })}
            >
              保存
            </Button>
            <Button type="button" variant="outline" size="xs" disabled={pending} onClick={cancel}>
              キャンセル
            </Button>
          </>
        ) : editable ? (
          <>
            {override && (
              <TextButton
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      `法定区分の上書きを外し、科目の既定の区分（${defaultLabel ?? "未定"}）に戻しますか？`,
                    )
                  )
                    onSave(null);
                }}
              >
                外す
              </TextButton>
            )}
            <button
              type="button"
              aria-label={override ? "法定区分の上書きを編集" : "法定区分を上書きする"}
              disabled={pending}
              onClick={() => setEditing(true)}
              className="cursor-pointer rounded-sm text-primary-hover outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-disabled-foreground"
            >
              <PencilSimple aria-hidden className="size-[15px]" />
            </button>
          </>
        ) : undefined
      }
      below={
        !editing && override && rejection ? (
          <p className="text-[11px] text-muted-foreground">{rejection}</p>
        ) : undefined
      }
    >
      {editing ? (
        <div className="space-y-1.5">
          <NativeSelect
            id={`${fieldId}-category`}
            value={legalCategoryKey}
            disabled={pending}
            className="h-8 text-[12.5px] md:text-[12.5px]"
            wrapperClassName="w-full"
            onChange={(e) => setLegalCategoryKey(e.target.value)}
          >
            <option value="">上書きする区分を選択</option>
            {options.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </NativeSelect>
          <Textarea
            id={`${fieldId}-reason`}
            aria-label="上書きの理由"
            rows={2}
            required
            maxLength={LEGAL_CATEGORY_OVERRIDE_REASON_MAX_LENGTH}
            disabled={pending}
            value={reason}
            placeholder="例: 提出済みの2025年分の報告書で調査研究費として計上したため"
            className="min-h-12 border-disabled-border text-[12.5px] md:text-[12.5px]"
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            科目の既定：{defaultLabel ?? "未定"}。科目（詳細の区分）は変わりません
          </p>
        </div>
      ) : override ? (
        <div className="space-y-0.5">
          <p>
            <span className="mr-1.5 rounded-full bg-primary px-1.5 text-[10px] leading-4 font-bold text-primary-foreground">
              上書き中
            </span>
            {override.label}
          </p>
          <p className="text-[11px] text-muted-foreground">科目の既定：{defaultLabel ?? "未定"}</p>
          <p className="text-[11px] whitespace-pre-wrap">理由：{override.reason}</p>
        </div>
      ) : (
        <span className="text-subtle-foreground">
          なし（科目の既定の区分）
          {rejection === null && defaultKey === null && "・科目を確定すると上書きできます"}
          {rejection !== null && allowed && `・${rejection}`}
        </span>
      )}
    </JournalOfficeRow>
  );
}
