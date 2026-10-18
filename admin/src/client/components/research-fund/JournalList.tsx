"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Keyboard, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/client/components/ui";
import {
  isAccountUnconfirmed,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  isReceiptAbsenceReasonMissing,
  isReceiptMissing,
} from "@/server/contexts/research-fund/domain/models/receipt-absence";
import { cn, isEmphasizedJournalAmount, journalAccountLabel } from "@/client/lib";

const statusLabels = { draft: "下書き", approved: "確認済", published: "公開中" };

// ヘッダーと行で共通の列。1280〜1439px は詳細カードが狭まる分、科目・項目・支払先・領収書等番号を詰める
// （列幅と pr-3 の合計 584px が、1280px 幅での一覧の幅に収まるようにする）。
const columns =
  "grid grid-cols-[36px_52px_116px_minmax(0,1fr)_170px_84px_84px_64px] items-center pr-3 xl:max-[1440px]:grid-cols-[36px_52px_96px_minmax(104px,1fr)_96px_40px_84px_64px]";

type Chip = {
  label: ReactNode;
  title: string;
  tone: "plain" | "primary" | "destructive" | "accent";
};

const chipTones: Record<Chip["tone"], string> = {
  plain: "border-subtle-foreground text-muted-foreground",
  primary: "border-primary text-primary-hover",
  destructive: "border-destructive text-destructive",
  accent: "border-primary bg-accent text-accent-foreground",
};

/** 項目名の右に並べる補助チップ（分割以外は 1440px 未満で省略し、項目名の title に回す） */
function chipsOf(
  entry: ReviewEntry,
  entries: readonly ReviewEntry[],
  duplicated: boolean,
): { split: Chip | null; others: Chip[] } {
  const splits = entry.splitGroup
    ? entries.filter((e) => e.splitGroup === entry.splitGroup && e.documentId === entry.documentId)
    : [];
  const split: Chip | null =
    splits.length > 1
      ? {
          label: `分割 ${splits.findIndex((e) => e.id === entry.id) + 1}/${splits.length}`,
          title: "分割",
          tone: "plain",
        }
      : null;
  const others: Chip[] = [];
  if (entry.advancedBy !== null)
    others.push({
      label: `立替 ${entry.advancedBy}`,
      title: `立替 ${entry.advancedBy}`,
      tone: "primary",
    });
  if (duplicated)
    others.push({ label: "同じ内容の書類あり", title: "同じ内容の書類あり", tone: "destructive" });
  // 徴難は書類の有無とは別に出す（振込明細などの書類があっても徴難のことがある）
  if (isReceiptMissing(entry))
    others.push({
      label: "書類なし・徴難なし",
      title: "書類が無く、徴難も付いていない",
      tone: "destructive",
    });
  else if (isReceiptAbsenceReasonMissing(entry))
    others.push({ label: "徴難・事情未入力", title: "徴難・事情未入力", tone: "destructive" });
  else if (entry.receiptAbsent) others.push({ label: "徴難", title: "徴難", tone: "plain" });
  if (entry.receiptAbsent && entry.documentId === null)
    others.push({ label: "書類なし", title: "書類なし", tone: "plain" });
  if (entry.settledAt !== null) {
    const settled = entry.settledAt.slice(5).replace("-", ".");
    others.push({
      label: (
        <>
          精算済 <span className="font-latin">{settled}</span>
        </>
      ),
      title: `精算済 ${settled}`,
      tone: "accent",
    });
  }
  return { split, others };
}

function ChipView({ chip, className }: { chip: Chip; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 items-center whitespace-nowrap rounded-full border px-1.5 text-[10.5px] leading-4",
        chipTones[chip.tone],
        className,
      )}
    >
      {chip.label}
    </span>
  );
}

/** 仕訳の状態ピル（一覧の行と詳細カードのヘッダーで共通） */
export function JournalStatusPill({ status }: { status: ReviewEntry["status"] }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full border px-[7px] text-[10.5px] leading-[18px]",
        status === "draft"
          ? "border-subtle-foreground bg-card text-muted-foreground"
          : "border-primary bg-accent text-accent-foreground",
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function AccountPill({ entry }: { entry: ReviewEntry }) {
  if (entry.source === "grant")
    return (
      <span className="truncate rounded-full border border-primary bg-accent px-2 py-px text-[11px] font-bold text-accent-foreground">
        支給
      </span>
    );
  const label = journalAccountLabel(entry);
  const unconfirmed = label === "要確認";
  return (
    <span
      title={label}
      className={cn(
        "max-w-full truncate rounded-full border bg-card px-2 py-px text-[11px] font-bold",
        unconfirmed ? "border-destructive text-destructive" : "border-primary text-primary-hover",
      )}
    >
      {label}
    </span>
  );
}

/**
 * 仕訳の確認・編集画面の一覧カード。ヘッダーとフッターを固定し、行のリストだけをスクロールさせる。
 * 選択行が見えなくなったら、一覧の本文だけをスクロールして見える位置に戻す。
 */
export function JournalList({
  visible,
  entries,
  selectedId,
  checked,
  checkable,
  pending,
  payeeNames,
  isDuplicated,
  onSelect,
  onToggle,
  onToggleAll,
  overlay,
}: {
  visible: readonly ReviewEntry[];
  /** 帳簿の全件（分割の通し番号を数える） */
  entries: readonly ReviewEntry[];
  selectedId: string | null;
  checked: readonly string[];
  /** チェックできる仕訳（支給以外） */
  checkable: readonly ReviewEntry[];
  pending: boolean;
  payeeNames: ReadonlyMap<string, string>;
  isDuplicated: (entry: ReviewEntry) => boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  /** 一覧カードの下部に重ねて出す要素（まとめて操作バー） */
  overlay?: ReactNode;
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const allChecked = checkable.length > 0 && checkable.every((e) => checked.includes(e.id));
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || selectedId === null) return;
    const row = body.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(selectedId)}"]`);
    if (!row) return;
    // scrollIntoView はページ全体も動かすので使わず、本文の scrollTop だけを変える
    // まとめて操作バーが重なっている間は、その分（本文の下の余白）を見えない範囲として扱う
    const hidden = Number.parseFloat(getComputedStyle(body).paddingBottom) || 0;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (bottom > body.scrollTop + body.clientHeight - hidden)
      body.scrollTop = bottom - body.clientHeight + hidden;
  }, [selectedId]);
  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card xl:min-h-0">
      <table aria-label="仕訳の一覧" className="flex min-h-0 flex-1 flex-col">
        <thead className="block">
          <tr className={cn(columns, "h-[34px] border-b border-border text-[11.5px] font-bold")}>
            <th scope="col" className="flex justify-center">
              <Checkbox
                checked={allChecked}
                disabled={pending || checkable.length === 0}
                onCheckedChange={onToggleAll}
                aria-label="表示中の支出の仕訳をすべて選択"
              />
            </th>
            <th scope="col" className="text-left">
              日付
            </th>
            <th scope="col" className="text-left">
              科目
            </th>
            <th scope="col" className="text-left">
              項目
            </th>
            <th scope="col" className="pl-2 text-left">
              支払先
            </th>
            <th scope="col" className="whitespace-nowrap pr-2 text-right">
              <span className="xl:max-[1440px]:hidden">領収書等番号</span>
              <span className="hidden xl:max-[1440px]:inline" title="領収書等番号">
                番号
              </span>
            </th>
            <th scope="col" className="text-right">
              金額
            </th>
            <th scope="col" className="text-center">
              状態
            </th>
          </tr>
        </thead>
        <tbody
          ref={bodyRef}
          // まとめて操作バーが重なっても最後の行まで見えるよう、下に余白を足す
          className={cn(
            "relative block max-h-[60vh] min-h-0 flex-1 overflow-y-auto xl:max-h-none",
            overlay && "pb-14",
          )}
        >
          {visible.map((entry) => {
            const grant = entry.source === "grant";
            const selected = entry.id === selectedId;
            const { split, others } = chipsOf(entry, entries, isDuplicated(entry));
            return (
              <tr
                key={entry.id}
                data-entry-id={entry.id}
                tabIndex={0}
                aria-selected={selected}
                onClick={() => onSelect(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(entry.id);
                  }
                }}
                className={cn(
                  columns,
                  "h-[38px] cursor-pointer border-b border-border-soft text-[13px] transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selected
                    ? "bg-accent shadow-[inset_3px_0_0_var(--color-primary)]"
                    : "bg-card hover:bg-background",
                  !selected &&
                    isAccountUnconfirmed(entry.accountKey) &&
                    "shadow-[inset_3px_0_0_var(--color-destructive)]",
                )}
              >
                <td
                  className="flex justify-center"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {!grant && (
                    <Checkbox
                      checked={checked.includes(entry.id)}
                      disabled={pending}
                      onCheckedChange={() => onToggle(entry.id)}
                      aria-label={`${entry.description}を選択`}
                      className="size-3.5"
                    />
                  )}
                </td>
                <td className="font-latin text-xs">{entry.entryDate.slice(5).replace("-", ".")}</td>
                <td className="flex min-w-0 pr-2">
                  <AccountPill entry={entry} />
                </td>
                <td
                  className="flex min-w-0 items-center gap-1.5 overflow-hidden"
                  title={[
                    entry.description,
                    ...[split, ...others].flatMap((c) => (c ? [c.title] : [])),
                  ].join(" ／ ")}
                >
                  <span className="min-w-[5em] truncate">{entry.description}</span>
                  {split && <ChipView chip={split} className="inline-flex" />}
                  {others.map((chip) => (
                    <ChipView
                      key={chip.title}
                      chip={chip}
                      className="inline-flex xl:max-[1440px]:hidden"
                    />
                  ))}
                </td>
                <td className="min-w-0 truncate pl-2 text-xs text-foreground">
                  {!grant &&
                    (entry.payeeId === null ? (
                      <span className="inline-flex items-center gap-1 font-bold text-destructive">
                        <WarningCircle aria-hidden className="size-3.5" />
                        未設定
                      </span>
                    ) : (
                      <span title={payeeNames.get(entry.payeeId) ?? "不明"}>
                        {payeeNames.get(entry.payeeId) ?? "不明"}
                      </span>
                    ))}
                </td>
                <td className="pr-2 text-right font-latin text-xs text-muted-foreground">
                  {entry.receiptNumber}
                </td>
                <td
                  className={cn(
                    "text-right font-latin text-[12.5px]",
                    isEmphasizedJournalAmount(entry.amount) && "font-bold",
                  )}
                >
                  ¥{entry.amount.toLocaleString("ja-JP")}
                </td>
                <td className="flex justify-center">
                  <JournalStatusPill status={entry.status} />
                </td>
              </tr>
            );
          })}
          {visible.length === 0 && (
            <tr>
              <td className="block p-8 text-center text-sm text-muted-foreground">
                該当する仕訳はありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-3 text-[11.5px] text-muted-foreground">
        <span>
          <span className="font-latin">{visible.length}</span>件
        </span>
        <span className="inline-flex items-center gap-1">
          <Keyboard aria-hidden className="size-3.5" />
          ↑↓ で移動
        </span>
      </div>
      {overlay}
    </div>
  );
}
