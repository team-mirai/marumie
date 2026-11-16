"use client";
import "client-only";

import { useId, useState } from "react";
import { ArrowRight, CircleNotch, Warning } from "@phosphor-icons/react/dist/ssr";
import { FileDropzone } from "@/client/components/common/FileDropzone";
import { ResearchFundSyncImportPlanCard } from "@/client/components/sync-import/ResearchFundSyncImportPlanCard";
import { Button, Input, Label } from "@/client/components/ui";
import { toUnexpectedErrorMessage, uploadSyncImportFile } from "@/client/lib/sync-import-upload";
import {
  matchesResearchFundSyncConfirmation,
  type ResearchFundSyncImportPlan,
  type ResearchFundSyncImportResult,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import type { PreviewResearchFundSyncImportResponse } from "@/server/contexts/research-fund/presentation/actions/preview-research-fund-sync-import";
import type { RunResearchFundSyncImportResponse } from "@/server/contexts/research-fund/presentation/actions/run-research-fund-sync-import";
import { SYNC_IMPORT_MAX_FILE_SIZE_LABEL } from "@/server/contexts/shared/domain/models/sync-import-file";
import type { PrepareSyncImportUploadResponse } from "@/server/contexts/shared/presentation/actions/prepare-sync-import-upload";

/** 上限はストレージのバケット（supabase/config.toml の sync-imports）の上限と同じ */
const FILE_NOTE = `調研費の同期用エクスポートのJSON ・ 最大 ${SYNC_IMPORT_MAX_FILE_SIZE_LABEL}`;

interface ResearchFundSyncImportClientProps {
  prepareUploadAction: (data: { fileSize: number }) => Promise<PrepareSyncImportUploadResponse>;
  previewAction: (data: { storageKey: string }) => Promise<PreviewResearchFundSyncImportResponse>;
  importAction: (data: {
    storageKey: string;
    confirmation: string;
  }) => Promise<RunResearchFundSyncImportResponse>;
}

export function ResearchFundSyncImportClient({
  prepareUploadAction,
  previewAction,
  importAction,
}: ResearchFundSyncImportClientProps) {
  const confirmationInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  /** ストレージに置いたファイルのキー。確認と取り込みで同じファイルを指す。 */
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [plan, setPlan] = useState<ResearchFundSyncImportPlan | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchFundSyncImportResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (next: File | null) => {
    setFile(next);
    setStorageKey(null);
    setPlan(null);
    setConfirmation("");
    setError(null);
    setResult(null);
  };

  async function onPreview(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    setPreviewing(true);
    setError(null);
    setResult(null);
    setPlan(null);
    setStorageKey(null);

    try {
      const uploaded = await uploadSyncImportFile(file, prepareUploadAction);
      if (!uploaded.ok) {
        setError(uploaded.error);
        return;
      }

      const response = await previewAction({ storageKey: uploaded.storageKey });
      if (response.ok) {
        setStorageKey(uploaded.storageKey);
        setPlan(response.plan);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(toUnexpectedErrorMessage(err, "確認内容の作成に失敗しました"));
    } finally {
      setPreviewing(false);
    }
  }

  async function onImport() {
    if (!file || !plan || !storageKey) return;

    setImporting(true);
    setError(null);

    try {
      const response = await importAction({ storageKey, confirmation });
      if (response.ok) {
        setResult(response.result);
        setFile(null);
        setStorageKey(null);
        setPlan(null);
        setConfirmation("");
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(toUnexpectedErrorMessage(err, "取り込みに失敗しました"));
    } finally {
      setImporting(false);
    }
  }

  const slugs = plan?.politicians.map((politician) => politician.slug) ?? [];
  const canImport =
    plan !== null &&
    matchesResearchFundSyncConfirmation(confirmation, slugs) &&
    !importing &&
    !previewing;

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
            ファイルに入っている議員室の帳簿・仕訳・支払先・支出群・プロンプト・書類・スキャン履歴は、この環境の分をすべて削除してから入れ直します。
            この環境にしか無いデータは失われます。ファイルに入っていない議員室は変更しません。
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
            {result.politicians.length.toLocaleString()} 件の議員室の調研費データを置き換えました
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {result.politicians.map((politician) => (
              <li key={politician.slug}>
                <span className="font-latin">{politician.slug}</span>:{" "}
                {politician.mode === "replace"
                  ? `仕訳 ${politician.deletedJournalEntryCount.toLocaleString()} 件を削除し、${politician.importedJournalEntryCount.toLocaleString()} 件を取り込み`
                  : `議員を作成し、仕訳 ${politician.importedJournalEntryCount.toLocaleString()} 件・所属履歴 ${politician.createdMembershipCount.toLocaleString()} 件を取り込み`}
              </li>
            ))}
          </ul>
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
          <ResearchFundSyncImportPlanCard plan={plan} />

          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={confirmationInputId}>
                確認のため、対象の議員 slug をすべてカンマ区切りで入力してください{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id={confirmationInputId}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={slugs.join(", ")}
                autoComplete="off"
                disabled={importing}
                className="max-w-[560px]"
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
