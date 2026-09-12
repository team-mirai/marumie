"use client";
import { useCallback, useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  ArrowRight,
  FileArrowUp,
  FilePdf,
  Image as ImageIcon,
  UploadSimple,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/client/components/layout/PageHeader";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui";
import { cn } from "@/client/lib";
import {
  SCAN_BATCH_MAX_DOCUMENTS,
  SCAN_DOCUMENT_MIME_TYPES,
  type ScanJobStatus,
  type ScanOverview,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import { createScanBatch } from "@/server/contexts/research-fund/presentation/actions/create-scan-batch";
import { processScanJobs } from "@/server/contexts/research-fund/presentation/actions/process-scan-jobs";
import { retryScanJob } from "@/server/contexts/research-fund/presentation/actions/retry-scan-job";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

const STATUS_LABELS: Record<ScanJobStatus, string> = {
  queued: "待機中",
  running: "処理中",
  succeeded: "完了",
  failed: "失敗",
};

const STATUS_STYLES: Record<ScanJobStatus, string> = {
  queued: "border-border-soft text-muted-foreground",
  running: "border-ring text-accent-foreground",
  succeeded: "border-primary bg-primary text-primary-foreground",
  failed: "border-destructive bg-destructive text-white",
};

/** 未処理が残っている間、次の処理を呼ぶまでの間隔（ミリ秒） */
const POLL_INTERVAL_MS = 1500;

function formatDate(isoDate: string) {
  return isoDate.slice(0, 10).replaceAll("-", ".");
}

/** アップロード前に弾く理由。通れば null */
function rejectionReason(files: File[]): string | null {
  if (files.length === 0) return "書類を1枚以上選んでください";
  if (files.length > SCAN_BATCH_MAX_DOCUMENTS)
    return `1回にアップロードできるのは${SCAN_BATCH_MAX_DOCUMENTS}枚までです（${files.length}枚が選ばれています）`;
  const unsupported = files.filter(
    (file) => !(SCAN_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type),
  );
  if (unsupported.length > 0)
    return `JPG・PNG・PDFのみアップロードできます（${unsupported[0].name}）`;
  return null;
}

export function DocumentScan({
  batches,
  activePromptVersion,
  model,
  target,
}: ScanOverview & { target: Extract<AdminTarget, { kind: "research-fund" }> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const ready = activePromptVersion !== null;
  const jobs = batches.flatMap((batch) => batch.jobs);
  const unfinished = jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  ).length;
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;

  /**
   * 待機中のジョブを少数だけ処理する。残りがあれば自動で次を呼ぶ（キュー基盤を持たないため、
   * 画面が呼び出し役を兼ねる）。実行中は再入しない。
   */
  const process = useCallback(async () => {
    setProcessing(true);
    try {
      const result = await processScanJobs(target.politicianId, target.bookId);
      if (!result.success) {
        toast.error(result.error);
        setAutoRun(false);
        return;
      }
      router.refresh();
      if (!result.hasMore) {
        setAutoRun(false);
        toast.success("読み取りが完了しました");
      }
    } catch {
      toast.error("通信に失敗しました。再度お試しください");
      setAutoRun(false);
    } finally {
      setProcessing(false);
    }
  }, [router, target.politicianId, target.bookId]);

  // 未処理が残っている間、一定間隔で処理を呼び続ける。1 回の呼び出しは少数しか進めない。
  useEffect(() => {
    if (!autoRun || processing || unfinished === 0) return;
    const timer = setTimeout(() => {
      void process();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [autoRun, processing, unfinished, process]);

  // 処理し切ったら自動実行を止める（失敗だけが残った場合もここで止まる）
  useEffect(() => {
    if (unfinished === 0) setAutoRun(false);
  }, [unfinished]);

  function start() {
    if (processing || unfinished === 0) return;
    setAutoRun(true);
    void process();
  }

  function retry(jobId: string) {
    startTransition(async () => {
      try {
        const result = await retryScanJob(target.politicianId, target.bookId, jobId);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        router.refresh();
        setAutoRun(true);
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  function upload(files: File[]) {
    if (inputRef.current) inputRef.current.value = "";
    const reason = rejectionReason(files);
    if (reason) {
      toast.error(reason);
      return;
    }
    const formData = new FormData();
    for (const file of files) formData.append("documents", file);
    startTransition(async () => {
      try {
        const result = await createScanBatch(target.politicianId, target.bookId, formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`${result.count}件の書類を読み取り待ちに追加しました`);
        router.refresh();
        setAutoRun(true);
      } catch {
        toast.error("通信に失敗しました。再度お試しください");
      }
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (pending || !ready) return;
    upload([...(event.dataTransfer.files ?? [])]);
  }

  return (
    <>
      <PageHeader
        label="Scan"
        title="書類スキャン"
        description="領収書の写真やPDFをまとめてアップロードすると、順番に読み取って下書き仕訳を作ります。"
      />
      <div className="flex flex-col gap-5">
        <Card className="max-w-3xl">
          <CardContent className="p-6">
            {/* biome-ignore lint/a11y/noStaticElementInteractions: ドロップ先の領域。操作は内側の button / input が担う */}
            <div
              data-slot="scan-dropzone"
              data-dragging={dragging || undefined}
              onDragOver={(event) => {
                event.preventDefault();
                if (!pending && ready) setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed border-primary bg-accent px-5 py-9 text-center transition-colors duration-150 ease-out",
                dragging && "border-primary-active bg-teal-soft/30",
                (pending || !ready) && "border-disabled-border bg-secondary",
              )}
            >
              <UploadSimple aria-hidden className="size-8 text-primary-active" />
              <span className="rounded-full bg-accent px-3.5 py-1 text-xs font-bold text-primary-active">
                {target.name} ／ {target.year}年度 の帳簿に追加されます
              </span>
              <p className="text-sm font-bold text-foreground">ここに領収書・請求書をドロップ</p>
              <p className="text-xs text-muted-foreground">
                JPG / PNG / PDF ・ 1回に最大{SCAN_BATCH_MAX_DOCUMENTS}枚 ・ スマホ写真もそのままでOK
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-1.5 text-xs"
                disabled={pending || !ready}
                onClick={() => inputRef.current?.click()}
              >
                {pending ? "アップロード中…" : "ファイルを選ぶ"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={SCAN_DOCUMENT_MIME_TYPES.join(",")}
                aria-label="領収書・請求書"
                className="sr-only"
                disabled={pending || !ready}
                onChange={(event) => upload([...(event.target.files ?? [])])}
              />
            </div>
            {!ready && (
              <p className="mt-4 text-sm text-destructive">
                読み取りプロンプトがまだ保存されていません。「読み取りプロンプト」で保存すると、アップロードできるようになります。
              </p>
            )}
          </CardContent>
        </Card>

        {batches.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={processing || pending || unfinished === 0}
              onClick={start}
            >
              {processing || autoRun
                ? `読み取り中… 残り${unfinished}件`
                : unfinished === 0
                  ? "未処理の書類はありません"
                  : `処理する（${unfinished}件）`}
            </Button>
            {succeeded > 0 && (
              <Button asChild variant="outline">
                <Link
                  href={`/politicians/${target.politicianId}/books/${target.bookId}/entries?status=draft`}
                >
                  完了分を確認へ
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        )}

        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだバッチがありません。書類をアップロードするとここに並びます。
          </p>
        ) : (
          batches.map((batch) => (
            <Card key={batch.id}>
              <CardContent className="p-6">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold">
                    <span className="font-latin">{formatDate(batch.createdAt)}</span> のバッチ
                    <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                      {batch.progress.total}件中 {batch.progress.succeeded}件完了・
                      {batch.progress.failed}件失敗
                    </span>
                  </h2>
                </div>
                <div
                  role="progressbar"
                  aria-label="読み取りの進捗"
                  aria-valuenow={batch.progress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mb-4 h-1.5 overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${batch.progress.percent}%` }}
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ファイル</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>抽出結果</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            {job.mime === "application/pdf" ? (
                              <FilePdf aria-hidden className="size-4 text-muted-foreground" />
                            ) : (
                              <ImageIcon aria-hidden className="size-4 text-muted-foreground" />
                            )}
                            <span className="font-latin text-xs">{job.originalFilename}</span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-block rounded-full border px-3 py-0.5 text-xs font-medium",
                              STATUS_STYLES[job.status],
                            )}
                          >
                            {STATUS_LABELS[job.status]}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-[13px]",
                            job.status === "failed" ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {job.status === "failed"
                            ? (job.error ?? "読み取りに失敗しました")
                            : (job.summary ?? "—")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {job.status === "failed" && (
                            <Button
                              type="button"
                              variant="outline"
                              className="text-xs"
                              disabled={pending || processing}
                              onClick={() => retry(job.id)}
                            >
                              <ArrowClockwise aria-hidden className="size-4" />
                              再実行
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
        <p className="flex items-center gap-1.5 text-[11.5px] text-subtle-foreground">
          <FileArrowUp aria-hidden className="size-4" />
          読み取りは議員室のプロンプト
          {activePromptVersion === null ? "（未保存）" : ` v${activePromptVersion}`} ＋{" "}
          <span className="font-latin">{model}</span>。原文JSONは各ジョブに保存されます。
        </p>
      </div>
    </>
  );
}
