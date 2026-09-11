"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  NativeSelect,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { JournalEditor } from "@/client/components/research-fund/JournalEditor";
import { ResearchFundCategoryPill } from "@/client/components/research-fund/ResearchFundCategoryPill";
import type {
  JournalEdit,
  ReviewAccount,
  ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import { mutateJournalReview } from "@/server/contexts/research-fund/presentation/actions/manage-journal-review";
import { cn } from "@/client/lib";

const statuses = { all: "すべて", draft: "下書き", approved: "確認済", published: "公開中" };
export function JournalReview({
  entries,
  accounts,
  target,
}: {
  entries: ReviewEntry[];
  accounts: ReviewAccount[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [pending, startTransition] = useTransition();
  const monthly = entries.filter((e) => !month || e.entryDate.slice(5, 7) === month);
  const visible = monthly.filter((e) => status === "all" || e.status === status);
  // 支給は支給の登録画面で扱うため、一覧には並べるが選択・編集の対象から外す。
  const selectable = visible.filter((e) => e.source !== "grant");
  const selected = selectable.find((e) => e.id === selectedId) ?? selectable[0] ?? null;
  const index = selectable.findIndex((e) => e.id === selected?.id);
  function allowLeave() {
    return (
      !document.querySelector('[data-journal-dirty="true"]') ||
      window.confirm("未保存の変更を破棄して移動しますか？")
    );
  }
  function select(id: string) {
    if (id !== selected?.id && !pending && allowLeave()) setSelectedId(id);
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        pending ||
        creating ||
        discarding ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")
      )
        return;
      const element = event.target;
      if (
        element instanceof HTMLElement &&
        element.closest(
          'input, textarea, select, button, a, [role="combobox"], [role="tab"], [contenteditable="true"], [role="dialog"]',
        )
      )
        return;
      const next = selectable[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        event.preventDefault();
        select(next.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function save(input: JournalEdit, approve: boolean) {
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(
          target.politicianId,
          target.bookId,
          creating
            ? { type: "create", input }
            : {
                type: "save",
                id: selected?.id ?? "",
                updatedAt: selected?.updatedAt ?? "",
                input,
                approve,
              },
        );
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          creating ? "下書きを作成しました" : approve ? "確認済にしました" : "保存しました",
        );
        if (result.id) {
          setStatus("all");
          setMonth("");
          setSelectedId(result.id);
        }
        setCreating(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function discard() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "discard",
          id: selected.id,
          updatedAt: selected.updatedAt,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("仕訳を破棄しました");
        setDiscarding(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  const documentUrl = selected?.documentId
    ? `/api/research-fund/documents/${selected.documentId}?bookId=${target.bookId}&politicianId=${target.politicianId}`
    : undefined;
  return (
    <>
      <PageHeader
        label="Journal entries"
        title="仕訳の確認・編集"
        description={`${target.name}・${target.year}年 — 領収書と並べて支出を確認します。↑↓キーで移動できます。`}
        actions={
          <Button
            disabled={pending}
            onClick={() => {
              if (allowLeave()) setCreating(true);
            }}
          >
            手動で仕訳を作成
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Tabs
          value={status}
          onValueChange={(value) => {
            if (!pending && allowLeave()) {
              setStatus(value);
              setSelectedId(null);
            }
          }}
        >
          <TabsList aria-label="仕訳の状態">
            {Object.entries(statuses).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>
                {label}（{monthly.filter((e) => key === "all" || e.status === key).length}）
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Label htmlFor="journal-month">月</Label>
          <NativeSelect
            id="journal-month"
            value={month}
            disabled={pending}
            onChange={(e) => {
              if (allowLeave()) {
                setMonth(e.target.value);
                setSelectedId(null);
              }
            }}
          >
            <option value="">すべての月</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>
                {i + 1}月
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>カテゴリー</TableHead>
                  <TableHead>項目</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((entry) => {
                  const splits = entry.splitGroup
                    ? entries.filter(
                        (e) =>
                          e.splitGroup === entry.splitGroup && e.documentId === entry.documentId,
                      )
                    : [];
                  const grant = entry.source === "grant";
                  return (
                    <TableRow
                      key={entry.id}
                      tabIndex={grant ? undefined : 0}
                      aria-selected={entry.id === selected?.id}
                      onClick={grant ? undefined : () => select(entry.id)}
                      onKeyDown={(event) => {
                        if (!grant && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          select(entry.id);
                        }
                      }}
                      className={cn(
                        !grant && "cursor-pointer",
                        entry.id === selected?.id && "bg-accent",
                        entry.accountKey === "needs-review" && "border-l-4 border-l-destructive",
                      )}
                    >
                      <TableCell className="font-latin whitespace-nowrap">
                        {entry.entryDate.replaceAll("-", ".")}
                      </TableCell>
                      <TableCell>
                        {grant ? (
                          <span className="inline-block whitespace-nowrap rounded-full border bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
                            支給
                          </span>
                        ) : (
                          <ResearchFundCategoryPill accountKey={entry.accountKey} />
                        )}
                      </TableCell>
                      <TableCell>
                        <span>{entry.description}</span>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                          {splits.length > 1 && (
                            <span className="rounded-full border px-2">
                              分割 {splits.findIndex((e) => e.id === entry.id) + 1}/{splits.length}
                            </span>
                          )}
                          {!entry.documentId && (
                            <span className="rounded-full border px-2">領収書なし</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-latin">
                        ¥{entry.amount.toLocaleString("ja-JP")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "whitespace-nowrap rounded-full border px-2 py-1 text-xs",
                            entry.status === "draft"
                              ? "bg-background text-muted-foreground"
                              : "bg-accent text-accent-foreground",
                          )}
                        >
                          {statuses[entry.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                      該当する仕訳はありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="xl:sticky xl:top-6">
          <CardContent className="p-5">
            {selected ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold">仕訳の詳細</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={pending || index <= 0}
                      onClick={() => select(selectable[index - 1].id)}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending || index >= selectable.length - 1}
                      onClick={() => select(selectable[index + 1].id)}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
                <JournalEditor
                  key={`${selected.id}:${selected.updatedAt}`}
                  entry={selected}
                  accounts={accounts}
                  year={target.year}
                  documentUrl={documentUrl}
                  pending={pending}
                  onSave={save}
                  onDiscard={() => setDiscarding(true)}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                仕訳を作成すると、ここで確認できます。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!pending && (open || allowLeave())) setCreating(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>手動で仕訳を作成</DialogTitle>
            <DialogDescription>領収書なしの支出を下書きとして登録します。</DialogDescription>
          </DialogHeader>
          <JournalEditor
            entry={null}
            accounts={accounts.filter((a) => a.key !== "needs-review")}
            year={target.year}
            pending={pending}
            onSave={save}
            onDiscard={() => {}}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={discarding}
        onOpenChange={(open) => {
          if (!pending) setDiscarding(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>仕訳を破棄しますか？</DialogTitle>
            <DialogDescription>
              「{selected?.description}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setDiscarding(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" disabled={pending} onClick={discard}>
              破棄する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
