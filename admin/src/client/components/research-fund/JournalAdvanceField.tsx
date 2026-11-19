"use client";
import { useId, useState } from "react";
import { Info, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { JournalOfficeRow, TextButton } from "@/client/components/research-fund/JournalOfficeRow";
import { detailLabelClassName } from "@/client/components/research-fund/JournalPublicFields";
import { Button, Input, Label } from "@/client/components/ui";
import {
  ADVANCED_BY_MAX_LENGTH,
  normalizeAdvancedBy,
  settlementRejection,
} from "@/server/contexts/research-fund/domain/models/advance";
import { todayInJst } from "@/server/contexts/research-fund/domain/models/calendar-date";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";

const dotted = (isoDate: string) => isoDate.replaceAll("-", ".");

/**
 * 詳細カードの「事務所内の管理」の立替者の行。立替者を入力・変更・解除し、精算済にする。
 *
 * 立替は事務所内の管理情報なので、公開中の仕訳でも変更できる。
 * 下書き・確認済の編集ビューでは最初から入力欄を出し、フッターの保存で仕訳と一緒に送る（onSave なし）。
 * 公開中の閲覧では鉛筆で行を編集モードにし、行ごとに保存する（onSave あり）。
 * 精算済の仕訳は精算した額と記録が合わなくなるので変更できず、未精算に戻してから直す。
 * 精算の可否と精算日の制限は、一覧の「まとめて精算」と同じ業務ルール（domain/models/advance）に従う。
 */
export function JournalAdvanceField({
  entry,
  advancers,
  pending,
  editing,
  value,
  onChange,
  onEdit,
  onCancel,
  onSave,
  onSettle,
  onUnsettle,
}: {
  entry: ReviewEntry;
  /** 同じ議員室で過去に入力された立替者（表記ゆれを防ぐ入力候補） */
  advancers: readonly string[];
  pending: boolean;
  /** 入力欄を出しているか（編集ビューでは常に true） */
  editing: boolean;
  value: string;
  onChange: (value: string) => void;
  /** 閲覧時に鉛筆で編集を始める（編集ビューでは渡さない） */
  onEdit?: () => void;
  onCancel?: () => void;
  /** 閲覧時の行ごとの保存（編集ビューではフッターの保存で送るので渡さない） */
  onSave?: (advancedBy: string) => void;
  onSettle: (settledAt: string) => void;
  onUnsettle: () => void;
}) {
  const fieldId = useId();
  // 精算日の入力欄（「精算済にする」を押してから出す）。日本時間の今日は、サーバーの時計と
  // ずれて hydration が食い違わないよう、押した時点のブラウザの時計から決める。
  const [settling, setSettling] = useState<{
    today: string;
    settledAt: string;
  } | null>(null);
  const unchanged = !editing || normalizeAdvancedBy(value) === entry.advancedBy;
  // 精算できない理由。立替者の変更を保存しないまま精算すると、入力中の名前が消えてしまうので止める。
  const rejection =
    entry.status === "draft" && entry.advancedBy !== null
      ? "精算は確認済にしてからできます"
      : (settlementRejection(entry) ??
        (unchanged ? null : "立替者の変更を保存してから精算してください"));
  if (entry.settledAt !== null)
    return (
      <JournalOfficeRow
        label={<span className={detailLabelClassName}>立替者</span>}
        action={
          <TextButton disabled={pending} onClick={onUnsettle}>
            未精算に戻す
          </TextButton>
        }
      >
        {entry.advancedBy} ／ 精算済 <span className="font-latin">{dotted(entry.settledAt)}</span>
      </JournalOfficeRow>
    );
  const settleAction =
    entry.advancedBy !== null && !(editing && onSave) ? (
      <>
        <span className="rounded-full border border-disabled-border px-1.5 text-[10.5px] leading-4 text-muted-foreground">
          未精算
        </span>
        {rejection === null && settling === null && (
          <TextButton
            disabled={pending}
            onClick={() => {
              const today = todayInJst(new Date());
              setSettling({ today, settledAt: today });
            }}
          >
            精算済にする
          </TextButton>
        )}
      </>
    ) : null;
  return (
    <JournalOfficeRow
      label={
        editing ? (
          <Label htmlFor={`${fieldId}-advanced-by`} className={detailLabelClassName}>
            立替者
          </Label>
        ) : (
          <span className={detailLabelClassName}>立替者</span>
        )
      }
      action={
        editing && onSave ? (
          <>
            <Button
              type="button"
              size="xs"
              aria-label="立替者を保存"
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
          <>
            {settleAction}
            {!editing && onEdit && (
              <button
                type="button"
                aria-label="立替者を編集"
                disabled={pending}
                onClick={onEdit}
                className="cursor-pointer rounded-sm text-primary-hover outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-disabled-foreground"
              >
                <PencilSimple aria-hidden className="size-[15px]" />
              </button>
            )}
          </>
        )
      }
      below={
        <>
          {entry.advancedBy !== null && rejection !== null && !(editing && onSave) && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info aria-hidden className="size-3 shrink-0" />
              {rejection}
            </p>
          )}
          {settling !== null && (
            <div className="space-y-1.5 rounded-md border border-border-soft p-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`${fieldId}-settled-at`} className={detailLabelClassName}>
                  精算日
                </Label>
                <Input
                  id={`${fieldId}-settled-at`}
                  type="date"
                  min={entry.entryDate}
                  max={settling.today}
                  disabled={pending}
                  value={settling.settledAt}
                  className="h-[30px] w-auto font-latin text-xs md:text-xs"
                  onChange={(e) =>
                    setSettling((current) =>
                      current === null ? current : { ...current, settledAt: e.target.value },
                    )
                  }
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                未来の日付と、仕訳の日付（
                <span className="font-latin">{dotted(entry.entryDate)}</span>
                ）より前の日付は指定できません
              </p>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={pending}
                  onClick={() => setSettling(null)}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  size="xs"
                  disabled={pending || settling.settledAt === "" || rejection !== null}
                  onClick={() => onSettle(settling.settledAt)}
                >
                  精算する
                </Button>
              </div>
            </div>
          )}
        </>
      }
    >
      {editing ? (
        <>
          <Input
            id={`${fieldId}-advanced-by`}
            list={`${fieldId}-advancers`}
            maxLength={ADVANCED_BY_MAX_LENGTH}
            disabled={pending}
            value={value}
            placeholder="立て替えた人（空欄なら立替なし）"
            title="立て替えた人を入力すると、支払ったあとに精算済にできます。空欄にして保存すると「調研費口座から直接支出（立替なし）」に戻ります"
            className="h-[30px] border-disabled-border text-[12.5px] md:text-[12.5px]"
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={`${fieldId}-advancers`}>
            {advancers.map((advancer) => (
              <option key={advancer} value={advancer} />
            ))}
          </datalist>
        </>
      ) : entry.advancedBy !== null ? (
        entry.advancedBy
      ) : (
        <span className="text-muted-foreground">なし（調研費口座から支出）</span>
      )}
    </JournalOfficeRow>
  );
}
