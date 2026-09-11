"use client";
import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, Plus, X } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { DeleteExpenditureGroupButton } from "@/client/components/research-fund/DeleteExpenditureGroupButton";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@/client/components/ui";
import { cn, formatCurrency, formatLinkedPeriod } from "@/client/lib";
import type {
  ExpenditureGroupRecord,
  LinkableEntry,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import { aggregateLinkedEntries } from "@/shared/research-fund/expenditure-group";
import { saveExpenditureGroup } from "@/server/contexts/research-fund/presentation/actions/manage-expenditure-groups";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

interface OutcomeDraft {
  /** 行の並べ替え・削除で入力欄が入れ替わらないようにする描画専用のキー */
  key: string;
  label: string;
  url: string;
}

let outcomeKeySequence = 0;
function emptyOutcome(): OutcomeDraft {
  outcomeKeySequence += 1;
  return { key: `outcome-${outcomeKeySequence}`, label: "", url: "" };
}

function initialOutcomes(group: ExpenditureGroupRecord | null): OutcomeDraft[] {
  if (!group || group.outcomes.length === 0) return [emptyOutcome()];
  return group.outcomes.map((outcome) => ({
    ...emptyOutcome(),
    label: outcome.label,
    url: outcome.url ?? "",
  }));
}

export function ExpenditureGroupForm({
  group,
  entries,
  target,
}: {
  group: ExpenditureGroupRecord | null;
  entries: readonly LinkableEntry[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState(group?.title ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [outcomes, setOutcomes] = useState<OutcomeDraft[]>(() => initialOutcomes(group));
  const [entryIds, setEntryIds] = useState<readonly string[]>(group?.entryIds ?? []);
  const [pending, startTransition] = useTransition();
  const listPath = `/politicians/${target.politicianId}/books/${target.bookId}/expenditure-groups`;

  const selected = useMemo(() => new Set(entryIds), [entryIds]);
  const summary = useMemo(
    () => aggregateLinkedEntries(entries.filter((entry) => selected.has(entry.id))),
    [entries, selected],
  );

  function updateOutcome(index: number, patch: Partial<OutcomeDraft>) {
    setOutcomes((current) =>
      current.map((outcome, position) => (position === index ? { ...outcome, ...patch } : outcome)),
    );
  }

  function submit() {
    startTransition(async () => {
      try {
        const result = await saveExpenditureGroup(
          target.politicianId,
          target.bookId,
          group?.id ?? null,
          {
            title,
            description,
            outcomes: outcomes.map(({ label, url }) => ({ label, url })),
            entryIds: [...entryIds],
          },
        );
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(group ? "支出群を保存しました" : "支出群を作成しました");
        router.push(listPath);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <div className="mb-2.5">
        <Link
          href={listPath}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-active hover:underline"
        >
          <CaretLeft size={13} />
          支出群の一覧に戻る
        </Link>
      </div>
      <PageHeader label="Groups" title={group ? "支出群を編集" : "支出群を作る"} />
      <div className="grid max-w-[1100px] items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,1fr)]">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <div>
              <Label htmlFor={titleId}>
                タイトル <span className="text-destructive">*</span>
              </Label>
              <Input
                id={titleId}
                className="mt-1.5"
                value={title}
                disabled={pending}
                placeholder="議会質問づくりの相棒（ボネクタ）"
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={descriptionId}>
                使った目的と、そこから生まれたもの <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={descriptionId}
                className="mt-1.5 min-h-20"
                rows={3}
                value={description}
                disabled={pending}
                placeholder="何のために使い、何ができたかを1〜3行で"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div>
              <Label asChild>
                <p>成果物（動画・レポート・議事録など）</p>
              </Label>
              <div className="mt-1.5 grid gap-2">
                {outcomes.map((outcome, index) => (
                  <div key={outcome.key} className="flex items-center gap-2">
                    <Input
                      className="h-9 w-44 text-[12.5px]"
                      value={outcome.label}
                      disabled={pending}
                      aria-label={`成果物${index + 1}のラベル`}
                      placeholder="ラベル（例：開催報告）"
                      onChange={(event) => updateOutcome(index, { label: event.target.value })}
                    />
                    <Input
                      className="h-9 flex-1 font-latin text-[12.5px]"
                      value={outcome.url}
                      disabled={pending}
                      aria-label={`成果物${index + 1}のURL`}
                      placeholder="URL（空なら「報告は準備中」と表示）"
                      onChange={(event) => updateOutcome(index, { url: event.target.value })}
                    />
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      disabled={pending}
                      aria-label={`成果物${index + 1}を削除`}
                      onClick={() =>
                        setOutcomes((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="xs"
                className="mt-2"
                disabled={pending}
                onClick={() => setOutcomes((current) => [...current, emptyOutcome()])}
              >
                <Plus size={12} />
                成果物を追加
              </Button>
            </div>
            <div className="flex gap-2.5">
              <Button
                disabled={pending || title.trim() === "" || description.trim() === ""}
                onClick={submit}
              >
                {group ? "保存する" : "作成する"}
              </Button>
              <Button asChild variant="outline">
                <Link href={listPath}>キャンセル</Link>
              </Button>
              {group && (
                <DeleteExpenditureGroupButton
                  groupId={group.id}
                  title={group.title}
                  target={target}
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="xl:sticky xl:top-6">
          <CardContent className="p-5">
            <h2 className="font-bold">仕訳の紐づけ</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              金額・件数・期間は紐づけた仕訳から自動集計されます。
            </p>
            <div
              role="status"
              aria-label="紐づけの集計"
              className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-[10px] bg-accent px-3.5 py-2.5 text-[12.5px]"
            >
              <span className="font-latin font-bold">{formatCurrency(summary.amount)}</span>
              <span>{summary.count}件</span>
              <span className="font-latin">{formatLinkedPeriod(summary.period)}</span>
            </div>
            {entries.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                紐づけられる費用の仕訳がまだありません。
              </p>
            ) : (
              <ul className="mt-3 grid max-h-[340px] gap-0.5 overflow-y-auto">
                {entries.map((entry) => {
                  const checked = selected.has(entry.id);
                  // 1 仕訳は 1 つの支出群にしか属せない。他で使われている仕訳は選ばせない
                  const takenByOther = entry.groupId !== null && entry.groupId !== group?.id;
                  return (
                    <li key={entry.id}>
                      <label
                        htmlFor={`link-${entry.id}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg p-2",
                          checked && "bg-accent",
                          takenByOther ? "cursor-not-allowed" : "cursor-pointer",
                        )}
                      >
                        <Checkbox
                          id={`link-${entry.id}`}
                          aria-label={`${entry.description}を紐づける`}
                          checked={checked}
                          disabled={pending || takenByOther}
                          onCheckedChange={(value) =>
                            setEntryIds((current) =>
                              value === true
                                ? [...current, entry.id]
                                : current.filter((id) => id !== entry.id),
                            )
                          }
                        />
                        <span className="font-latin w-11 shrink-0 text-[11px] text-muted-foreground">
                          {entry.entryDate.slice(5).replace("-", "/")}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[12.5px]",
                            takenByOther && "text-disabled-foreground",
                          )}
                          title={takenByOther ? "他の支出群に紐づいています" : entry.description}
                        >
                          {entry.description}
                        </span>
                        <span className="font-latin shrink-0 text-xs font-semibold">
                          {formatCurrency(entry.amount)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2.5 text-[11px] text-disabled-foreground">
              人件費・事務所費のような運営費は成果カードの対象外です。
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
