"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, CardContent, Label, Textarea } from "@/client/components/ui";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { cn } from "@/client/lib";
import type { PromptOverview } from "@/server/contexts/research-fund/domain/models/prompt";
import { mutatePrompt } from "@/server/contexts/research-fund/presentation/actions/manage-prompt";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

function formatDate(isoDate: string) {
  return isoDate.slice(0, 10).replaceAll("-", ".");
}

export function PromptEditor({
  versions,
  body: savedBody,
  activeVersion,
  nextVersion,
  automaticPrompt,
  target,
}: PromptOverview & { target: Extract<AdminTarget, { kind: "research-fund" }> }) {
  const router = useRouter();
  const fieldId = useId();
  const [body, setBody] = useState(savedBody);
  const [pending, startTransition] = useTransition();
  const dirty = body !== savedBody;
  // 版が 1 つも無いうちは、デフォルトテンプレートのまま保存して v1 を作れるようにする
  const savable = body.trim().length > 0 && (dirty || activeVersion === null);

  function run(mutation: Parameters<typeof mutatePrompt>[2], onSuccess: (message: string) => void) {
    startTransition(async () => {
      try {
        const result = await mutatePrompt(target.politicianId, target.bookId, mutation);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        onSuccess(
          mutation.type === "save"
            ? `v${result.version} として保存し、有効版にしました`
            : `v${mutation.version} に巻き戻しました`,
        );
        router.refresh();
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  return (
    <>
      <PageHeader
        label="Prompt"
        title="読み取りプロンプト"
        description={`${target.name}の議員室のスキャンで使う整理プロンプト。保存すると新しい版になり、各ジョブは使った版を記録します。`}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <Card>
          <CardContent className="p-5">
            <details className="mb-4 rounded-lg border border-border-soft">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold">
                自動で付加される部分を見る（出力スキーマ・費用カテゴリの語彙と定義）
              </summary>
              <div className="border-t border-border-soft px-4 py-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  システムが自動で付加します。この画面からは編集できません。
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-background p-3 text-xs">
                  {automaticPrompt}
                </pre>
              </div>
            </details>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={fieldId}>プロンプト本文</Label>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-latin",
                  activeVersion === null
                    ? "text-muted-foreground"
                    : "border-ring bg-accent text-accent-foreground",
                )}
              >
                {activeVersion === null ? "未保存（デフォルト）" : `v${activeVersion} 有効`}
              </span>
            </div>
            <Textarea
              id={fieldId}
              rows={16}
              className="min-h-80 font-mono text-sm"
              value={body}
              disabled={pending}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={pending || !savable}
                onClick={() => run({ type: "save", body }, (message) => toast.success(message))}
              >
                保存して v{nextVersion} にする
              </Button>
              <Button
                variant="outline"
                disabled={pending || !dirty}
                onClick={() => setBody(savedBody)}
              >
                変更を破棄
              </Button>
            </div>
            {activeVersion === null && (
              <p className="mt-3 text-xs text-muted-foreground">
                まだ版がありません。デフォルトテンプレートを下敷きに編集し、保存すると v1
                になります。
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="xl:sticky xl:top-6">
          <CardContent className="p-5">
            <h2 className="mb-3 font-bold">版履歴</h2>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">保存するとここに版が並びます。</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border-soft p-3",
                      version.isActive && "border-ring bg-accent",
                    )}
                  >
                    <span className="font-latin font-bold">v{version.version}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{version.summary}</div>
                      <div className="font-latin text-xs text-muted-foreground">
                        {formatDate(version.updatedAt)}・{version.jobCount}ジョブ
                      </div>
                    </div>
                    {version.isActive ? (
                      <span className="rounded-full border border-ring px-2 py-1 text-xs text-accent-foreground">
                        有効
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run({ type: "rollback", version: version.version }, (message) =>
                            toast.success(message),
                          )
                        }
                      >
                        巻き戻し
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
