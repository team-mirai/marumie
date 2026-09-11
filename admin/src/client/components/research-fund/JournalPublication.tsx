"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { ResearchFundSankey } from "@/client/components/research-fund/ResearchFundSankey";
import { Button, Card, CardContent, Checkbox } from "@/client/components/ui";
import { cn, describePublishDelta, formatCurrency } from "@/client/lib";
import type {
  PublicationSnapshot,
  PublishCandidate,
} from "@/server/contexts/research-fund/domain/models/publication";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import { publishJournalEntries } from "@/server/contexts/research-fund/presentation/actions/publish-journal-entries";
import { aggregateResearchFund } from "@/shared/research-fund/aggregation";

function aggregate(
  rows: PublicationSnapshot["published"],
  accounts: PublicationSnapshot["accounts"],
) {
  const result = aggregateResearchFund(rows, accounts);
  return result.status === "valid" ? result.value : null;
}

function SankeyCard({
  tag,
  caption,
  aggregation,
}: {
  tag: "BEFORE" | "AFTER";
  caption: string;
  aggregation: ReturnType<typeof aggregate>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
          <span
            className={cn(
              "font-latin rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              tag === "AFTER"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {tag}
          </span>
          <span className="text-[13px] text-muted-foreground">{caption}</span>
        </div>
        {aggregation ? (
          <ResearchFundSankey
            granted={aggregation.kpi.granted}
            categories={aggregation.categories}
          />
        ) : (
          <p className="py-10 text-center text-sm text-destructive">
            集計できないデータが含まれています
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function JournalPublication({
  published,
  candidates,
  accounts,
  publishedThrough,
  target,
}: PublicationSnapshot & { target: Extract<AdminTarget, { kind: "research-fund" }> }) {
  const router = useRouter();
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [pending, startTransition] = useTransition();
  const selected = candidates.filter((candidate) => checked.includes(candidate.id));
  const selectedTotal = selected.reduce((sum, candidate) => sum + candidate.amount, 0);
  const before = useMemo(() => aggregate(published, accounts), [published, accounts]);
  const after = useMemo(
    () => aggregate([...published, ...candidates.filter((c) => checked.includes(c.id))], accounts),
    [published, accounts, candidates, checked],
  );
  const delta = before && after ? describePublishDelta(before, after) : null;

  function toggle(candidate: PublishCandidate) {
    setChecked((current) =>
      current.includes(candidate.id)
        ? current.filter((id) => id !== candidate.id)
        : [...current, candidate.id],
    );
  }
  function publish() {
    startTransition(async () => {
      try {
        const result = await publishJournalEntries(target.politicianId, target.bookId, checked);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(
          `${result.count}件を公開しました（公開範囲 〜${(result.publishedThrough ?? "").replaceAll("-", ".")}）`,
        );
        if (result.cacheWarning)
          toast.warning(`公開しましたが、まる見えの更新に失敗しました: ${result.cacheWarning}`);
        setChecked([]);
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <PageHeader
        label="Publish"
        title="公開"
        description="確認済の仕訳を選ぶと、公開したときのサンキー図の変化を並べて確認できます。"
      />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-5">
            <div className="mb-2.5 text-sm font-bold">
              確認済・未公開{" "}
              <span className="font-latin text-primary-hover">{candidates.length}</span>件
            </div>
            <ul className="grid gap-0.5">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <label
                    htmlFor={`publish-${candidate.id}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2",
                      checked.includes(candidate.id) && "bg-accent",
                    )}
                  >
                    <Checkbox
                      id={`publish-${candidate.id}`}
                      checked={checked.includes(candidate.id)}
                      onCheckedChange={() => toggle(candidate)}
                      disabled={pending}
                      aria-label={`${candidate.description}を公開対象にする`}
                    />
                    <span className="font-latin w-12 shrink-0 text-[11.5px] text-muted-foreground">
                      {candidate.date.slice(5).replace("-", "/")}
                    </span>
                    <span className="flex-1 text-[13px]">{candidate.description}</span>
                    <span className="font-latin text-[12.5px] font-semibold">
                      {formatCurrency(candidate.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {candidates.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                公開できる確認済の仕訳はありません
              </p>
            )}
            <Button
              className="mt-3.5 w-full"
              disabled={selected.length === 0 || pending}
              onClick={publish}
            >
              <Globe size={15} />
              {selected.length === 0
                ? "公開する仕訳を選んでください"
                : `${selected.length}件（${formatCurrency(selectedTotal)}）を公開する`}
            </Button>
            <p className="mt-2.5 text-xs leading-relaxed text-subtle-foreground">
              公開すると「調研費まる見え」に即時反映され、公開範囲の表記
              {publishedThrough
                ? `（現在 〜${publishedThrough.replaceAll("-", ".")}）`
                : "（現在 未公開）"}
              も更新されます。
            </p>
          </CardContent>
        </Card>
        <div className="grid gap-3.5">
          <SankeyCard
            tag="BEFORE"
            caption={
              publishedThrough
                ? `現在の公開状態（〜${publishedThrough.replaceAll("-", ".")}・${formatCurrency(before?.kpi.spent ?? 0)}）`
                : "現在の公開状態（未公開）"
            }
            aggregation={before}
          />
          <SankeyCard
            tag="AFTER"
            caption={
              selected.length === 0
                ? "仕訳を選ぶとこちらが変化します"
                : `選択中の ${selected.length}件 を公開した場合`
            }
            aggregation={after}
          />
          <p className="text-[13px] text-muted-foreground">
            {delta ??
              "左のリストで仕訳にチェックを入れると、費目ごとの増分と未使用の減少をここに表示します。"}
          </p>
        </div>
      </div>
    </>
  );
}
