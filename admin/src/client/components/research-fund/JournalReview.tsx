"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
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
  Textarea,
} from "@/client/components/ui";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { JournalEditor } from "@/client/components/research-fund/JournalEditor";
import { LegalCategoryLabel } from "@/client/components/research-fund/LegalCategoryLabel";
import { ResearchFundCategoryPill } from "@/client/components/research-fund/ResearchFundCategoryPill";
import {
  legalLabelOf,
  type JournalEdit,
  type ReviewAccount,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import {
  previewReread,
  REREAD_INSTRUCTION_MAX_LENGTH,
} from "@/server/contexts/research-fund/domain/models/scan-reread";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import { mutateJournalReview } from "@/server/contexts/research-fund/presentation/actions/manage-journal-review";
import { rereadScanDocuments } from "@/server/contexts/research-fund/presentation/actions/reread-scan-documents";
import { cn } from "@/client/lib";

const statuses = { all: "すべて", draft: "下書き", approved: "確認済", published: "公開中" };
export function JournalReview({
  entries,
  accounts,
  target,
  initialStatus,
}: {
  entries: ReviewEntry[];
  accounts: ReviewAccount[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
  /** スキャン画面の「完了分を確認へ」から下書きタブを開くための初期値 */
  initialStatus?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(
    initialStatus && Object.hasOwn(statuses, initialStatus) ? initialStatus : "all",
  );
  const [month, setMonth] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [creating, setCreating] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [rereading, setRereading] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [pending, startTransition] = useTransition();
  const monthly = entries.filter((e) => !month || e.entryDate.slice(5, 7) === month);
  const visible = monthly.filter((e) => status === "all" || e.status === status);
  // 支給も支出と同じく選べる。支給日の修正と確認済に戻す操作だけを許す（詳細側で制限する）。
  const selected = visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;
  const index = visible.findIndex((e) => e.id === selected?.id);
  // まとめて確認済にできるのは、いま表示している下書きだけ（支給と公開中は対象外）。
  const checkable = visible.filter((e) => e.status === "draft" && e.source !== "grant");
  const checkedEntries = checkable.filter((e) => checked.includes(e.id));
  const allChecked = checkable.length > 0 && checkedEntries.length === checkable.length;
  // 読み直しは書類単位。選んでいない同じ書類の下書きも作り直し、確認済・公開中を含む書類は外す。
  const reread = previewReread(checkedEntries, entries);
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
        rereading ||
        discarding ||
        unpublishing ||
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
      const next = visible[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        event.preventDefault();
        select(next.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function toggle(id: string) {
    setChecked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }
  function approveChecked() {
    const targets = checkedEntries.map((e) => ({ id: e.id, updatedAt: e.updatedAt }));
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "approve-many",
          targets,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const { approved = 0, skipped = 0 } = result.approved ?? {};
        toast.success(
          skipped > 0
            ? `${approved}件を確認済にしました（科目が要確認の${skipped}件は下書きのまま残しました）`
            : `${approved}件を確認済にしました`,
        );
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function rereadChecked() {
    const entryIds = checkedEntries.map((e) => e.id);
    startTransition(async () => {
      try {
        const result = await rereadScanDocuments(target.politicianId, target.bookId, {
          entryIds,
          instruction,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          result.excludedCount > 0
            ? `${result.documentCount}件の書類を読み直し待ちに追加しました（確認済・公開中の仕訳を含む${result.excludedCount}件の書類は対象外です）`
            : `${result.documentCount}件の書類を読み直し待ちに追加しました`,
          { description: "スキャン画面の「処理する」で読み直しが進みます" },
        );
        setRereading(false);
        setInstruction("");
        setChecked([]);
        router.push(`/politicians/${target.politicianId}/books/${target.bookId}/scan`);
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
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
          setChecked([]);
        }
        setCreating(false);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }
  function unpublish() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const result = await mutateJournalReview(target.politicianId, target.bookId, {
          type: "unpublish",
          id: selected.id,
          updatedAt: selected.updatedAt,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("確認済に戻しました。修正して改めて公開できます");
        if (result.cacheWarning)
          toast.warning(
            `確認済に戻しましたが、まる見えの更新に失敗しました: ${result.cacheWarning}`,
          );
        setUnpublishing(false);
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
              setChecked([]);
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
                setChecked([]);
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
      {checkedEntries.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-accent px-4 py-3">
          <span className="text-sm font-bold text-accent-foreground">
            <span className="font-latin">{checkedEntries.length}</span>件の下書きを選択中
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setChecked([])}>
              選択を解除
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (allowLeave()) setRereading(true);
              }}
            >
              LLMで読み直す
            </Button>
            <Button disabled={pending} onClick={approveChecked}>
              まとめて確認済にする
            </Button>
          </div>
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked}
                      disabled={pending || checkable.length === 0}
                      onCheckedChange={() =>
                        setChecked(allChecked ? [] : checkable.map((e) => e.id))
                      }
                      aria-label="表示中の下書きをすべて選択"
                    />
                  </TableHead>
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
                      tabIndex={0}
                      aria-selected={entry.id === selected?.id}
                      onClick={() => select(entry.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          select(entry.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer",
                        entry.id === selected?.id && "bg-accent",
                        entry.accountKey === "needs-review" && "border-l-4 border-l-destructive",
                      )}
                    >
                      <TableCell
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {entry.status === "draft" && !grant && (
                          <Checkbox
                            checked={checked.includes(entry.id)}
                            disabled={pending}
                            onCheckedChange={() => toggle(entry.id)}
                            aria-label={`${entry.description}を選択`}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-latin whitespace-nowrap">
                        {entry.entryDate.replaceAll("-", ".")}
                      </TableCell>
                      <TableCell>
                        {grant ? (
                          <span className="inline-block whitespace-nowrap rounded-full border bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
                            支給
                          </span>
                        ) : (
                          <>
                            <ResearchFundCategoryPill accountKey={entry.accountKey} />
                            <LegalCategoryLabel
                              legalLabel={legalLabelOf(accounts, entry.accountKey)}
                              className="mt-1 block"
                            />
                          </>
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
                    <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
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
                      onClick={() => select(visible[index - 1].id)}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending || index >= visible.length - 1}
                      onClick={() => select(visible[index + 1].id)}
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
                  onUnpublish={() => setUnpublishing(true)}
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
            onUnpublish={() => {}}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={rereading}
        onOpenChange={(open) => {
          if (!pending) setRereading(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LLMで読み直しますか？</DialogTitle>
            <DialogDescription>
              選んだ下書きの書類を、指示を添えて読み直します。読み直しは書類ごとに行い、
              その書類から作られた下書きはすべて、読み直した結果に置き換わります（選んでいない下書きも含みます）。
              備考・特記事項や支出群への所属は引き継がれません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reread-instruction">どう読み直すか</Label>
            <Textarea
              id="reread-instruction"
              value={instruction}
              maxLength={REREAD_INSTRUCTION_MAX_LENGTH}
              rows={4}
              disabled={pending}
              placeholder="例：会議室代と来客用のお茶代は異なるから、これらは別の科目として入れ直してください"
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>
              読み直す書類：<span className="font-latin">{reread.documentCount}</span>
              件（作り直す下書き
              <span className="font-latin">{reread.draftCount}</span>件）
            </li>
            {reread.excludedDocumentCount > 0 && (
              <li className="text-destructive">
                確認済・公開中の仕訳を含む書類
                <span className="font-latin">{reread.excludedDocumentCount}</span>
                件は対象外です（その仕訳は消えません）
              </li>
            )}
            {reread.withoutDocumentCount > 0 && (
              <li>
                書類の紐づかない下書き
                <span className="font-latin">{reread.withoutDocumentCount}</span>
                件は対象外です
              </li>
            )}
            <li>読み直しはスキャン画面で進み、失敗したときは元の下書きが残ります</li>
          </ul>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setRereading(false)}>
              キャンセル
            </Button>
            <Button
              disabled={pending || reread.documentCount === 0 || instruction.trim().length === 0}
              onClick={rereadChecked}
            >
              読み直す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={unpublishing}
        onOpenChange={(open) => {
          if (!pending) setUnpublishing(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認済に戻しますか？</DialogTitle>
            <DialogDescription>
              「{selected?.description}」は「調研費まる見え」の公開ページから消えます。
              修正したあと、公開画面から改めて公開してください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setUnpublishing(false)}>
              キャンセル
            </Button>
            <Button disabled={pending} onClick={unpublish}>
              確認済に戻す
            </Button>
          </DialogFooter>
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
