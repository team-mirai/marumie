"use client";
import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button, Card, CardContent, Label, Textarea } from "@/client/components/ui";
import { cn, formatCurrency, formatLinkedPeriod } from "@/client/lib";
import type { ExpenditureGroupSummary } from "@/server/contexts/research-fund/domain/models/expenditure-group";
import {
  reorderExpenditureGroups,
  saveUsagePolicy,
} from "@/server/contexts/research-fund/presentation/actions/manage-expenditure-groups";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

export function ExpenditureGroupList({
  groups,
  policyComment: savedPolicyComment,
  target,
}: {
  groups: readonly ExpenditureGroupSummary[];
  policyComment: string;
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const policyFieldId = useId();
  const [policyComment, setPolicyComment] = useState(savedPolicyComment);
  const [pending, startTransition] = useTransition();
  const base = `/politicians/${target.politicianId}/books/${target.bookId}/expenditure-groups`;

  function savePolicy() {
    startTransition(async () => {
      try {
        const result = await saveUsagePolicy(target.politicianId, target.bookId, policyComment);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("活用方針を保存しました");
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  /** index の支出群を offset だけ動かした並びを保存する。表示順は左上から右下へ数える */
  function move(index: number, offset: number) {
    const moved = [...groups];
    const [group] = moved.splice(index, 1);
    if (!group) return;
    moved.splice(index + offset, 0, group);
    startTransition(async () => {
      try {
        const result = await reorderExpenditureGroups(
          target.politicianId,
          target.bookId,
          moved.map((item) => item.id),
        );
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <PageHeader
        label="Groups"
        title="支出群と成果"
        description="支出をまとめて「活用方針」と「主要な成果」を書く。金額・件数・期間は紐づけた仕訳から自動集計されます。"
        actions={
          <Button asChild>
            <Link href={`${base}/new`}>
              <Plus size={14} />
              支出群を作る
            </Link>
          </Button>
        }
      />
      <Card className="mb-5 max-w-4xl">
        <CardContent className="p-5">
          <Label htmlFor={policyFieldId}>活用方針（帳簿全体・議員本人が書く1〜2行）</Label>
          <Textarea
            id={policyFieldId}
            className="mt-1.5 min-h-14"
            rows={2}
            value={policyComment}
            disabled={pending}
            onChange={(event) => setPolicyComment(event.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="xs"
              disabled={pending || policyComment === savedPolicyComment}
              onClick={savePolicy}
            >
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
      {groups.length === 0 ? (
        <Card className="max-w-4xl">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            まだ支出群がありません。「支出群を作る」から、仕訳を束ねて成果を書けます。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,420px))]">
          {groups.map((group, index) => (
            <Card key={group.id}>
              <CardContent className="p-5">
                <h2 className="text-[15.5px] font-bold">{group.title}</h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    <span className="font-latin font-bold text-foreground">
                      {formatCurrency(group.amount)}
                    </span>
                    （自動集計）
                  </span>
                  <span>{group.count}件</span>
                  <span className="font-latin">{formatLinkedPeriod(group.period)}</span>
                </div>
                <p className="mt-2.5 border-l-[3px] border-teal-soft pl-2.5 text-[13px] leading-[1.8] whitespace-pre-wrap">
                  {group.description}
                </p>
                {group.outcomes.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {group.outcomes.map((outcome) => (
                      <li key={`${outcome.label}-${outcome.url ?? ""}`}>
                        <OutcomeChip label={outcome.label} url={outcome.url} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild variant="outline" size="xs">
                    <Link href={`${base}/${group.id}`}>編集</Link>
                  </Button>
                  <div className="ml-auto flex gap-1.5">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={pending || index === 0}
                      aria-label={`${group.title}を前に移動`}
                      onClick={() => move(index, -1)}
                    >
                      <CaretLeft size={12} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled={pending || index === groups.length - 1}
                      aria-label={`${group.title}を後ろに移動`}
                      onClick={() => move(index, 1)}
                    >
                      <CaretRight size={12} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** URL があれば teal のリンクチップ、無ければグレーで「報告は準備中」を添える */
function OutcomeChip({ label, url }: { label: string; url: string | null }) {
  const className = cn(
    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold",
    url
      ? "bg-accent text-accent-foreground hover:underline"
      : "border border-border-soft bg-secondary text-muted-foreground",
  );
  if (!url) return <span className={className}>{label}（報告は準備中）</span>;
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}
