"use client";
import { useId, useState } from "react";
import { Button, Input, Label } from "@/client/components/ui";
import {
  ADVANCED_BY_MAX_LENGTH,
  normalizeAdvancedBy,
  settlementRejection,
} from "@/server/contexts/research-fund/domain/models/advance";
import { todayInJst } from "@/server/contexts/research-fund/domain/models/calendar-date";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";

/**
 * 1 件の支出の立替者を入力・変更・解除し、精算済にする欄。
 *
 * 立替は事務所内の管理情報なので、公開中の仕訳でも変更できる（仕訳の編集フォームとは別に保存する）。
 * 精算済の仕訳は精算した額と記録が合わなくなるので変更できず、未精算に戻してから直す。
 * 精算の可否と精算日の制限は、一覧の「まとめて精算」と同じ業務ルール（domain/models/advance）に従う。
 */
export function JournalAdvanceField({
  entry,
  advancers,
  pending,
  onSave,
  onSettle,
  onUnsettle,
}: {
  entry: ReviewEntry;
  /** 同じ議員室で過去に入力された立替者（表記ゆれを防ぐ入力候補） */
  advancers: readonly string[];
  pending: boolean;
  onSave: (advancedBy: string) => void;
  onSettle: (settledAt: string) => void;
  onUnsettle: () => void;
}) {
  const fieldId = useId();
  const [value, setValue] = useState(entry.advancedBy ?? "");
  // 精算日の入力欄（「精算済にする」を押してから出す）。日本時間の今日は、サーバーの時計と
  // ずれて hydration が食い違わないよう、押した時点のブラウザの時計から決める。
  const [settling, setSettling] = useState<{ today: string; settledAt: string } | null>(null);
  const unchanged = normalizeAdvancedBy(value) === entry.advancedBy;
  // 精算できない理由。立替者の変更を保存しないまま精算すると、入力中の名前が消えてしまうので止める。
  const rejection =
    settlementRejection(entry) ?? (unchanged ? null : "立替者の変更を保存してから精算してください");
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
          {entry.advancedBy === null ? (
            <p className="text-xs text-muted-foreground">
              立て替えた人を入力すると、支払ったあとに精算済にできます。公開中の仕訳でも変更でき、公開ページの内容は変わりません。
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              立て替えた分を支払ったら「精算済にする」で精算日を記録してください。立替者を空欄にして保存すると「調研費口座から直接支出（立替なし）」に戻ります（誤って入力したときの取り消し用）。公開中の仕訳でも変更でき、公開ページの内容は変わりません。
            </p>
          )}
          {entry.advancedBy !== null &&
            (settling === null ? (
              <>
                <Button
                  type="button"
                  disabled={pending || rejection !== null}
                  onClick={() => {
                    const today = todayInJst(new Date());
                    setSettling({ today, settledAt: today });
                  }}
                >
                  精算済にする
                </Button>
                {rejection !== null && (
                  <p className="text-xs font-bold text-primary-active">{rejection}</p>
                )}
              </>
            ) : (
              <div className="space-y-2 border-t border-border-soft pt-2">
                <Label htmlFor={`${fieldId}-settled-at`}>精算日</Label>
                <Input
                  id={`${fieldId}-settled-at`}
                  type="date"
                  required
                  min={entry.entryDate}
                  max={settling.today}
                  disabled={pending}
                  value={settling.settledAt}
                  onChange={(e) =>
                    setSettling((current) =>
                      current === null ? current : { ...current, settledAt: e.target.value },
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  未来の日付と、仕訳の日付（
                  <span className="font-latin">{entry.entryDate.replaceAll("-", ".")}</span>
                  ）より前の日付は指定できません
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setSettling(null)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    disabled={pending || settling.settledAt === "" || rejection !== null}
                    onClick={() => onSettle(settling.settledAt)}
                  >
                    精算する
                  </Button>
                </div>
                {rejection !== null && (
                  <p className="text-xs font-bold text-primary-active">{rejection}</p>
                )}
              </div>
            ))}
        </>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-bold">{entry.advancedBy}</span>
            ／精算済（<span className="font-latin">{entry.settledAt.replaceAll("-", ".")}</span>）
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
