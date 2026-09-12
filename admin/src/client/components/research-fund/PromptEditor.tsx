"use client";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleNotch, Play } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, CardContent, Label, NativeSelect, Textarea } from "@/client/components/ui";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { cn } from "@/client/lib";
import type {
  PromptOverview,
  PromptTestDocument,
} from "@/server/contexts/research-fund/domain/models/prompt";
import { mutatePrompt } from "@/server/contexts/research-fund/presentation/actions/manage-prompt";
import { testPrompt } from "@/server/contexts/research-fund/presentation/actions/test-prompt";
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
  testDocuments,
  target,
}: PromptOverview & {
  testDocuments: PromptTestDocument[];
  target: Extract<AdminTarget, { kind: "research-fund" }>;
}) {
  const router = useRouter();
  const fieldId = useId();
  const testDocumentId = useId();
  const [body, setBody] = useState(savedBody);
  const [pending, startTransition] = useTransition();
  const [selectedDocumentId, setSelectedDocumentId] = useState(testDocuments[0]?.id ?? "");
  const [testing, startTesting] = useTransition();
  const [testResult, setTestResult] = useState<{ json: string } | { error: string } | null>(null);
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

  function runTest() {
    setTestResult(null);
    startTesting(async () => {
      try {
        const result = await testPrompt(target.politicianId, target.bookId, {
          documentId: selectedDocumentId,
          body,
        });
        setTestResult(
          result.success
            ? { json: JSON.stringify(result.extracted, null, 2) }
            : { error: result.error },
        );
      } catch {
        setTestResult({ error: "通信に失敗しました。再度お試しください" });
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
        <div className="flex flex-col gap-5">
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
                disabled={pending || testing}
                onChange={(event) => {
                  setBody(event.target.value);
                  setTestResult(null);
                }}
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
                  onClick={() => {
                    setBody(savedBody);
                    setTestResult(null);
                  }}
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
          <Card>
            <CardContent className="p-5">
              <h2 className="font-bold">テスト実行</h2>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                編集中の本文（未保存でよい）で書類1枚だけを読み取り、結果を確認できます。仕訳・ジョブは作られません。
              </p>
              {testDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  この帳簿にはまだ書類がありません。「書類スキャン」からアップロードすると選べるようになります。
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={testDocumentId}>書類</Label>
                    <NativeSelect
                      id={testDocumentId}
                      className="w-60"
                      value={selectedDocumentId}
                      disabled={testing}
                      onChange={(event) => {
                        setSelectedDocumentId(event.target.value);
                        setTestResult(null);
                      }}
                    >
                      {testDocuments.map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.originalFilename}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    variant="outline"
                    disabled={testing || body.trim().length === 0 || !selectedDocumentId}
                    onClick={runTest}
                  >
                    {testing ? (
                      <CircleNotch aria-hidden className="size-4 animate-spin" />
                    ) : (
                      <Play aria-hidden className="size-4" />
                    )}
                    {testing ? "読み取り中…" : "テスト実行"}
                  </Button>
                </div>
              )}
              {testResult !== null &&
                ("json" in testResult ? (
                  <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-accent p-4 font-mono text-xs">
                    {testResult.json}
                  </pre>
                ) : (
                  <p className="mt-4 text-sm text-destructive">{testResult.error}</p>
                ))}
            </CardContent>
          </Card>
        </div>
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
