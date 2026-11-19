"use client";
import { useId, useMemo, useState, type ReactNode } from "react";
import { MagnifyingGlass, Paperclip } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui";
import { JournalDocumentPreview } from "@/client/components/research-fund/JournalDocumentPreview";
import { cn, formatCurrency, formatLinkedPeriod } from "@/client/lib";
import {
  EMPTY_LINK_CANDIDATE_FILTER,
  filterLinkCandidates,
  isTakenByOtherGroup,
  type LinkCandidateFilter,
  type LinkStateFilter,
} from "@/client/lib/research-fund-link-candidates";
import type { DocumentMasking } from "@/server/contexts/research-fund/domain/models/document-masking";
import type { LinkCandidate } from "@/server/contexts/research-fund/domain/models/expenditure-group";
import { aggregateLinkedEntries } from "@/shared/research-fund/expenditure-group";

const STATE_LABELS: Record<LinkStateFilter, string> = {
  all: "すべて",
  unlinked: "未紐づけのみ",
  "this-group": "この支出群のみ",
};

function formatEntryDate(date: string): string {
  return date.replaceAll("-", ".");
}

/**
 * 支出群に紐づける仕訳を選ぶ欄（#1875）。
 * 候補を絞り込み、行を押すと右に仕訳の中身（支払先・特記事項・領収書）を出して確かめながら選べる。
 * 選択は親のフォームが持ち、絞り込みを変えても保たれる。保存は親のフォームの保存で行う。
 */
export function ExpenditureGroupEntryPicker({
  entries,
  groupId,
  selectedIds,
  onSelectedIdsChange,
  maskings,
  target,
  pending,
}: {
  entries: readonly LinkCandidate[];
  /** 編集中の支出群。新規なら null */
  groupId: string | null;
  selectedIds: readonly string[];
  onSelectedIdsChange: (update: (current: readonly string[]) => readonly string[]) => void;
  /** 書類 ID → 公開用の版の状態 */
  maskings: Record<string, DocumentMasking>;
  target: { politicianId: string; bookId: string };
  pending: boolean;
}) {
  const fieldId = useId();
  const [filter, setFilter] = useState<LinkCandidateFilter>(EMPTY_LINK_CANDIDATE_FILTER);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const summary = useMemo(
    () => aggregateLinkedEntries(entries.filter((entry) => selected.has(entry.id))),
    [entries, selected],
  );
  const visible = filterLinkCandidates(entries, filter, groupId, selected);
  const selectableVisible = visible.filter((entry) => !isTakenByOtherGroup(entry, groupId));
  const visibleSelectedCount = selectableVisible.filter((entry) => selected.has(entry.id)).length;
  const focused = entries.find((entry) => entry.id === focusedId) ?? null;
  const filtering =
    filter.query.trim() !== "" ||
    filter.dateFrom !== "" ||
    filter.dateTo !== "" ||
    filter.amountMin !== "" ||
    filter.amountMax !== "";

  function patchFilter(patch: Partial<LinkCandidateFilter>) {
    setFilter((current) => ({ ...current, ...patch }));
  }

  function toggle(entryId: string, checked: boolean) {
    onSelectedIdsChange((current) =>
      checked
        ? current.includes(entryId)
          ? current
          : [...current, entryId]
        : current.filter((id) => id !== entryId),
    );
  }

  function selectVisible() {
    const additions = selectableVisible
      .map((entry) => entry.id)
      .filter((entryId) => !selected.has(entryId));
    onSelectedIdsChange((current) => [...current, ...additions]);
  }

  function unselectVisible() {
    const removals = new Set(selectableVisible.map((entry) => entry.id));
    onSelectedIdsChange((current) => current.filter((entryId) => !removals.has(entryId)));
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="font-bold">仕訳の紐づけ</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              行を押すと、右に仕訳の中身と領収書が表示されます。金額・件数・期間は選んだ仕訳から自動集計されます。
            </p>
          </div>
          <div
            role="status"
            aria-label="紐づけの集計"
            className="flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] bg-accent px-3.5 py-2.5 text-[12.5px]"
          >
            <span className="font-bold">選択中</span>
            <span className="font-latin font-bold">{formatCurrency(summary.amount)}</span>
            <span>{summary.count}件</span>
            <span className="font-latin">{formatLinkedPeriod(summary.period)}</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">紐づけられる費用の仕訳がまだありません。</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative w-64">
                <MagnifyingGlass
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  aria-label="仕訳を検索"
                  className="h-9 pl-8 text-[12.5px]"
                  placeholder="摘要・支払先・科目・特記事項で検索"
                  value={filter.query}
                  onChange={(event) => patchFilter({ query: event.target.value })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label htmlFor={`${fieldId}-from`} className="sr-only">
                  日付の開始
                </Label>
                <Input
                  id={`${fieldId}-from`}
                  type="date"
                  className="h-9 w-36 font-latin text-[12.5px]"
                  value={filter.dateFrom}
                  onChange={(event) => patchFilter({ dateFrom: event.target.value })}
                />
                <span className="text-xs text-muted-foreground">〜</span>
                <Label htmlFor={`${fieldId}-to`} className="sr-only">
                  日付の終了
                </Label>
                <Input
                  id={`${fieldId}-to`}
                  type="date"
                  className="h-9 w-36 font-latin text-[12.5px]"
                  value={filter.dateTo}
                  onChange={(event) => patchFilter({ dateTo: event.target.value })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  inputMode="numeric"
                  aria-label="金額の下限"
                  className="h-9 w-28 font-latin text-[12.5px]"
                  placeholder="金額 下限"
                  value={filter.amountMin}
                  onChange={(event) => patchFilter({ amountMin: event.target.value })}
                />
                <span className="text-xs text-muted-foreground">〜</span>
                <Input
                  inputMode="numeric"
                  aria-label="金額の上限"
                  className="h-9 w-28 font-latin text-[12.5px]"
                  placeholder="金額 上限"
                  value={filter.amountMax}
                  onChange={(event) => patchFilter({ amountMax: event.target.value })}
                />
              </div>
              {filtering && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    setFilter((current) => ({
                      ...EMPTY_LINK_CANDIDATE_FILTER,
                      state: current.state,
                    }))
                  }
                >
                  条件をクリア
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs
                value={filter.state}
                onValueChange={(value) => patchFilter({ state: value as LinkStateFilter })}
              >
                <TabsList>
                  {(Object.keys(STATE_LABELS) as LinkStateFilter[]).map((state) => (
                    <TabsTrigger key={state} value={state} className="text-xs">
                      {STATE_LABELS[state]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  表示中 <span className="font-latin">{visible.length}</span> 件
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={pending || visibleSelectedCount === selectableVisible.length}
                  onClick={selectVisible}
                >
                  表示中をすべて選ぶ
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={pending || visibleSelectedCount === 0}
                  onClick={unselectVisible}
                >
                  表示中の選択を外す
                </Button>
              </div>
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              {visible.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                  条件に合う仕訳がありません。
                </p>
              ) : (
                <ul
                  aria-label="紐づけ候補の仕訳"
                  className="grid max-h-[65vh] overflow-y-auto rounded-md border border-border-soft"
                >
                  {visible.map((entry) => (
                    <CandidateRow
                      key={entry.id}
                      entry={entry}
                      checked={selected.has(entry.id)}
                      takenByOther={isTakenByOtherGroup(entry, groupId)}
                      focused={entry.id === focused?.id}
                      pending={pending}
                      onCheckedChange={(checked) => toggle(entry.id, checked)}
                      onFocus={() => setFocusedId(entry.id)}
                    />
                  ))}
                </ul>
              )}
              <aside aria-label="仕訳の詳細" className="lg:sticky lg:top-6">
                {focused ? (
                  <CandidateDetail
                    entry={focused}
                    checked={selected.has(focused.id)}
                    takenByOther={isTakenByOtherGroup(focused, groupId)}
                    pending={pending}
                    masking={focused.documentId ? maskings[focused.documentId] : undefined}
                    target={target}
                    onCheckedChange={(checked) => toggle(focused.id, checked)}
                  />
                ) : (
                  <p className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                    一覧の行を押すと、仕訳の中身と領収書をここで確かめられます。
                  </p>
                )}
              </aside>
            </div>
          </>
        )}
        <p className="text-[11px] text-disabled-foreground">
          人件費・事務所費のような運営費は成果カードの対象外です。
        </p>
      </CardContent>
    </Card>
  );
}

function CandidateRow({
  entry,
  checked,
  takenByOther,
  focused,
  pending,
  onCheckedChange,
  onFocus,
}: {
  entry: LinkCandidate;
  checked: boolean;
  takenByOther: boolean;
  focused: boolean;
  pending: boolean;
  onCheckedChange: (checked: boolean) => void;
  onFocus: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 border-b border-border-soft px-3 py-2 last:border-b-0",
        checked && "bg-accent",
        focused && "outline-[1.5px] -outline-offset-[1.5px] outline-primary-active",
      )}
    >
      <Checkbox
        className="mt-0.5"
        aria-label={`${entry.description}を紐づける`}
        checked={checked}
        // 1 仕訳は 1 つの支出群にしか属せない。他で使われている仕訳は選ばせない
        disabled={pending || takenByOther}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <button
        type="button"
        aria-label={`${entry.description}の詳細を表示`}
        aria-pressed={focused}
        className="grid min-w-0 flex-1 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onFocus}
      >
        <span className="font-latin pt-px text-[11px] text-muted-foreground">
          {formatEntryDate(entry.entryDate)}
        </span>
        <span
          className={cn(
            "truncate text-[12.5px] font-bold",
            takenByOther && "text-disabled-foreground",
          )}
        >
          {entry.description}
        </span>
        <span className="font-latin text-right text-xs font-semibold">
          {formatCurrency(entry.amount)}
        </span>
        <span className="col-start-2 col-end-4 flex min-w-0 flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span>{entry.payeeName ?? "支払先未設定"}</span>
          <span>{entry.accountLabel}</span>
          {entry.documentId !== null && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip aria-hidden className="size-3" />
              領収書あり
            </span>
          )}
          {takenByOther && (
            <span className="rounded-full border border-disabled-border px-2 text-[10.5px]">
              「{entry.groupTitle}」に紐づけ済み
            </span>
          )}
        </span>
        {entry.note !== "" && (
          <span className="col-start-2 col-end-4 truncate text-[11px] text-muted-foreground">
            特記事項：{entry.note}
          </span>
        )}
      </button>
    </li>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5em_minmax(0,1fr)] gap-2 py-1.5">
      <dt className="font-bold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function CandidateDetail({
  entry,
  checked,
  takenByOther,
  pending,
  masking,
  target,
  onCheckedChange,
}: {
  entry: LinkCandidate;
  checked: boolean;
  takenByOther: boolean;
  pending: boolean;
  masking: DocumentMasking | undefined;
  target: { politicianId: string; bookId: string };
  onCheckedChange: (checked: boolean) => void;
}) {
  const empty = <span className="text-disabled-foreground">なし</span>;
  return (
    <div className="grid gap-3 rounded-md border border-disabled-border p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-latin text-[11px] text-muted-foreground">
            {formatEntryDate(entry.entryDate)}
          </p>
          <h3 className="text-sm font-bold break-words">{entry.description}</h3>
        </div>
        <span className="font-latin shrink-0 text-sm font-bold">
          {formatCurrency(entry.amount)}
        </span>
      </div>
      <dl className="divide-y divide-border-soft text-xs">
        <DetailRow label="支払先">{entry.payeeName ?? empty}</DetailRow>
        <DetailRow label="科目">{entry.accountLabel}</DetailRow>
        <DetailRow label="特記事項">
          {entry.note ? <span className="whitespace-pre-wrap">{entry.note}</span> : empty}
        </DetailRow>
        <DetailRow label="備考">
          {entry.memo ? <span className="whitespace-pre-wrap">{entry.memo}</span> : empty}
        </DetailRow>
      </dl>
      <JournalDocumentPreview
        grant={false}
        target={target}
        documentId={entry.documentId}
        masking={masking}
      />
      {takenByOther ? (
        <p className="text-xs text-muted-foreground">
          「{entry.groupTitle}」に紐づいているため選べません。
        </p>
      ) : (
        <Button
          variant={checked ? "outline" : "default"}
          size="sm"
          disabled={pending}
          onClick={() => onCheckedChange(!checked)}
        >
          {checked ? "この仕訳の紐づけを外す" : "この仕訳を紐づける"}
        </Button>
      )}
    </div>
  );
}
