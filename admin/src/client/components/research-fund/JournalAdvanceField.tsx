"use client";
import { useId, useState } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import {
  ADVANCED_BY_MAX_LENGTH,
  normalizeAdvancedBy,
} from "@/server/contexts/research-fund/domain/models/advance";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";

/**
 * 1 件の支出の立替者を入力・変更・解除する欄。
 *
 * 立替は事務所内の管理情報なので、公開中の仕訳でも変更できる（仕訳の編集フォームとは別に保存する）。
 * 精算済の仕訳は精算した額と記録が合わなくなるので変更できず、未精算に戻してから直す。
 */
export function JournalAdvanceField({
  entry,
  advancers,
  pending,
  onSave,
  onUnsettle,
}: {
  entry: ReviewEntry;
  /** 同じ議員室で過去に入力された立替者（表記ゆれを防ぐ入力候補） */
  advancers: readonly string[];
  pending: boolean;
  onSave: (advancedBy: string) => void;
  onUnsettle: () => void;
}) {
  const fieldId = useId();
  const [value, setValue] = useState(entry.advancedBy ?? "");
  const unchanged = normalizeAdvancedBy(value) === entry.advancedBy;
  return (
    <div className="mt-4 space-y-2 rounded-lg bg-background p-3">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${fieldId}-advanced-by`}>立替者</Label>
        <span className="rounded-full border px-2 text-xs text-muted-foreground">公開されない</span>
      </div>
      {entry.settledAt === null ? (
        <>
          <div className="flex items-start gap-2">
            <Input
              id={`${fieldId}-advanced-by`}
              list={`${fieldId}-advancers`}
              maxLength={ADVANCED_BY_MAX_LENGTH}
              disabled={pending}
              value={value}
              placeholder="立て替えた人（空欄なら立替なし）"
              onChange={(e) => setValue(e.target.value)}
            />
            <datalist id={`${fieldId}-advancers`}>
              {advancers.map((advancer) => (
                <option key={advancer} value={advancer} />
              ))}
            </datalist>
            <Button
              type="button"
              variant="outline"
              disabled={pending || unchanged}
              onClick={() => onSave(value)}
            >
              立替者を保存
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            空欄にして保存すると「調研費口座から直接支出（立替なし）」になります。公開中の仕訳でも変更でき、公開ページの内容は変わりません。
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-bold">{entry.advancedBy}</span>
            ／精算済（<span className="font-latin">{entry.settledAt}</span>）
          </p>
          <p className="text-xs text-muted-foreground">
            精算済の仕訳は金額・立替者を変更できず、破棄もできません。直すには未精算に戻してください。
          </p>
          <Button type="button" variant="outline" disabled={pending} onClick={onUnsettle}>
            未精算に戻す
          </Button>
        </>
      )}
    </div>
  );
}
