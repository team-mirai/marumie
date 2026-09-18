"use client";
import "client-only";

import { useId, useState } from "react";
import { ArrowRight, CircleNotch, Warning } from "@phosphor-icons/react/dist/ssr";
import { FileDropzone } from "@/client/components/common/FileDropzone";
import { SyncImportPlanCard } from "@/client/components/sync-import/SyncImportPlanCard";
import { Button, Input, Label } from "@/client/components/ui";
import type {
  OrganizationSyncImportPlan,
  OrganizationSyncImportResult,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type { PreviewSyncImportResponse } from "@/server/contexts/data-import/presentation/actions/preview-sync-import";
import type { RunSyncImportResponse } from "@/server/contexts/data-import/presentation/actions/run-sync-import";

/** 上限は next.config.ts の serverActions.bodySizeLimit に合わせる */
const FILE_NOTE = "同期用エクスポートのJSON ・ 最大 100MB";

interface SyncImportClientProps {
  previewAction: (data: { file: File }) => Promise<PreviewSyncImportResponse>;
  importAction: (data: { file: File; confirmationSlug: string }) => Promise<RunSyncImportResponse>;
}

export function SyncImportClient({ previewAction, importAction }: SyncImportClientProps) {
  const confirmationInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<OrganizationSyncImportPlan | null>(null);
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrganizationSyncImportResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (next: File | null) => {
    setFile(next);
    setPlan(null);
    setConfirmationSlug("");
    setError(null);
    setResult(null);
  };

  async function onPreview(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    setPreviewing(true);
    setError(null);
    setResult(null);

    try {
      const response = await previewAction({ file });
      if (response.ok) {
        setPlan(response.plan);
      } else {
        setPlan(null);
        setError(response.error);
      }
    } catch (err) {
      setPlan(null);
      setError(err instanceof Error ? err.message : "確認内容の作成に失敗しました");
    } finally {
      setPreviewing(false);
    }
  }

  async function onImport() {
    if (!file || !plan) return;

    setImporting(true);
    setError(null);

    try {
      const response = await importAction({ file, confirmationSlug });
      if (response.ok) {
        setResult(response.result);
        setFile(null);
        setPlan(null);
        setConfirmationSlug("");
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
    } finally {
      setImporting(false);
    }
  }

  const canImport =
    plan !== null && confirmationSlug.trim() === plan.organizationSlug && !importing && !previewing;

  return (
    <div className="space-y-6">
      <div
        role="note"
        className="flex gap-3 rounded-lg border border-destructive bg-destructive-hover p-4 text-sm text-destructive"
      >
        <Warning aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-bold">この操作は取り消せません</p>
          <p>
            ファイルに書かれた政治団体の取引・残高は、この環境の分をすべて削除してから入れ直します。
            この環境にしか無い取引は失われます。
          </p>
        </div>
      </div>

      <form onSubmit={onPreview} className="rounded-lg border border-border bg-card p-7">
        <FileDropzone
          file={file}
          onFileChange={handleFileChange}
          disabled={previewing || importing}
          note={FILE_NOTE}
          title="同期用JSONをドラッグ＆ドロップ"
          accept=".json,application/json"
          inputLabel="同期用JSONファイル"
        />

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={!file || previewing || importing}
            className="tracking-[0.06em]"
          >
            {previewing ? (
              <>
                <CircleNotch aria-hidden className="animate-spin" />
                確認中…
              </>
            ) : (
              <>
                確認内容を表示
                <ArrowRight aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive bg-destructive-hover p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && (
        <div
          role="status"
          className="space-y-1 rounded-lg border border-primary-active bg-accent p-4 text-sm text-primary-active"
        >
          <p className="font-bold">
            {result.organizationSlug} のデータを置き換えました（取引{" "}
            {result.deletedTransactionCount.toLocaleString()} 件を削除し、
            {result.importedTransactionCount.toLocaleString()} 件を取り込み）
          </p>
          <p>
            新規作成: 取引先 {result.createdCounterpartCount.toLocaleString()} 件 / 寄付者{" "}
            {result.createdDonorCount.toLocaleString()} 件、残高{" "}
            {result.importedBalanceSnapshotCount.toLocaleString()} 件、報告書プロフィール{" "}
            {result.upsertedReportProfileCount.toLocaleString()} 件を上書き
          </p>
          {result.cacheInvalidationError && (
            <p className="text-destructive">
              取り込みは完了しましたが、webappのキャッシュ無効化に失敗しました:{" "}
              {result.cacheInvalidationError}
            </p>
          )}
        </div>
      )}

      {plan && (
        <>
          <SyncImportPlanCard plan={plan} />

          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={confirmationInputId}>
                確認のため、対象の政治団体 slug を入力してください{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id={confirmationInputId}
                value={confirmationSlug}
                onChange={(event) => setConfirmationSlug(event.target.value)}
                placeholder={plan.organizationSlug}
                autoComplete="off"
                disabled={importing}
                className="max-w-[360px]"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="destructive" disabled={!canImport} onClick={onImport}>
                {importing ? (
                  <>
                    <CircleNotch aria-hidden className="animate-spin" />
                    取り込み中…
                  </>
                ) : (
                  "このファイルの内容で置き換える"
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
