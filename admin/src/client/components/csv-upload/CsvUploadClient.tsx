"use client";
import "client-only";

import { useId, useState } from "react";
import { ArrowRight, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { Button, Label, NativeSelect } from "@/client/components/ui";
import { cn } from "@/client/lib";
import { CsvDropzone } from "@/client/components/csv-upload/CsvDropzone";
import CsvPreview from "@/client/components/csv-import/CsvPreview";
import type { PreviewMfCsvResult } from "@/server/contexts/data-import/presentation/types";
import type {
  UploadCsvRequest,
  UploadCsvResponse,
} from "@/server/contexts/data-import/presentation/actions/upload-csv";
import type { PreviewCsvRequest } from "@/server/contexts/data-import/presentation/actions/preview-csv";

interface CsvUploadClientProps {
  /** グローバル対象（サイドバー上部）で選択中の政治団体 */
  politicalOrganizationId: string;
  uploadAction: (data: UploadCsvRequest) => Promise<UploadCsvResponse>;
  previewAction: (data: PreviewCsvRequest) => Promise<PreviewMfCsvResult>;
}

/** 現在サポートしているデータソース。取り込みロジックは MF クラウド会計のみ */
const DATA_SOURCES = [{ value: "mf", label: "MFクラウド会計" }] as const;

/** 対応形式と上限サイズ（上限は next.config.ts の serverActions.bodySizeLimit に合わせる） */
const FILE_NOTE = "UTF-8 / Shift-JIS ・ 最大 100MB";

export default function CsvUploadClient({
  politicalOrganizationId,
  uploadAction,
  previewAction,
}: CsvUploadClientProps) {
  const dataSourceSelectId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [dataSource, setDataSource] = useState<string>(DATA_SOURCES[0].value);
  const [message, setMessage] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewMfCsvResult | null>(null);

  // ファイルが変わったら、古いプレビューは破棄する
  const resetPreview = () => {
    setPreviewResult(null);
    setPreviewError(null);
  };

  const handleFileChange = (next: File | null) => {
    setFile(next);
    setMessage("");
    setErrors([]);
    setHasError(false);
    resetPreview();
  };

  async function onPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !politicalOrganizationId) return;
    setPreviewing(true);
    setPreviewError(null);
    setMessage("");
    setErrors([]);
    setHasError(false);

    try {
      const result = await previewAction({ file, politicalOrganizationId });
      setPreviewResult(result);
    } catch (err) {
      setPreviewResult(null);
      setPreviewError(err instanceof Error ? err.message : "CSVのプレビューに失敗しました");
    } finally {
      setPreviewing(false);
    }
  }

  async function onSave() {
    if (!file || !politicalOrganizationId || !previewResult) return;
    setUploading(true);
    setMessage("");
    setErrors([]);
    setHasError(false);

    try {
      const validTransactions = previewResult.transactions.filter(
        (t) => t.status === "insert" || t.status === "update",
      );
      if (validTransactions.length === 0) {
        setMessage("保存可能なデータがありません");
        setHasError(true);
        return;
      }

      const result = await uploadAction({
        validTransactions,
        politicalOrganizationId,
      });

      if (!result.ok && result.errors && result.errors.length > 0) {
        setMessage(result.message);
        setErrors(result.errors);
        setHasError(true);
        return;
      }

      const uploadedFileName = file.name;
      const serverMessage =
        result.message ||
        `Successfully processed ${result.processedCount} records and saved ${result.savedCount} transactions`;

      setMessage(`"${uploadedFileName}" の取り込み結果: ${serverMessage}`);
      setFile(null);
      resetPreview();
    } catch (err) {
      console.error("Upload error:", err);
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setHasError(true);
      // For admin interface, show stack trace
      if (err instanceof Error && err.stack) {
        setErrors([err.stack]);
      }
    } finally {
      setUploading(false);
    }
  }

  const canPreview = Boolean(file) && Boolean(politicalOrganizationId) && !previewing && !uploading;
  const canSave =
    Boolean(previewResult) &&
    (previewResult?.summary.insertCount ?? 0) + (previewResult?.summary.updateCount ?? 0) > 0 &&
    !uploading &&
    !previewing;

  return (
    <div className="space-y-6">
      <form
        onSubmit={onPreview}
        className="max-w-[720px] rounded-lg border border-border bg-card p-7"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={dataSourceSelectId}>
              データソース <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              id={dataSourceSelectId}
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              required
              wrapperClassName="w-full"
              className="border-[1.5px] text-[13px]"
            >
              {DATA_SOURCES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="mt-6">
          <CsvDropzone
            file={file}
            onFileChange={handleFileChange}
            disabled={previewing || uploading}
            note={FILE_NOTE}
          />
        </div>

        {previewError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-destructive bg-destructive-hover p-3 text-sm text-destructive"
          >
            プレビューに失敗しました: {previewError}
          </div>
        )}

        {message && (
          <div
            role="status"
            className={cn(
              "mt-4 rounded-lg border p-3 text-sm",
              hasError
                ? "border-destructive bg-destructive-hover text-destructive"
                : "border-primary-active bg-accent text-primary-active",
            )}
          >
            {message}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-3 rounded-lg border border-destructive bg-destructive-hover p-3 text-sm text-destructive">
            <div className="mb-2 font-bold">エラー詳細:</div>
            {errors.map((error) => (
              <pre
                key={error}
                className="mb-2 overflow-x-auto rounded border border-border-soft bg-card p-2 font-mono text-xs whitespace-pre-wrap text-foreground last:mb-0"
              >
                {error}
              </pre>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={!canPreview} className="tracking-[0.06em]">
            {previewing ? (
              <>
                <CircleNotch aria-hidden className="animate-spin" />
                プレビュー中…
              </>
            ) : (
              <>
                プレビューを表示
                <ArrowRight aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>

      {previewResult && (
        <CsvPreview
          result={previewResult}
          footer={
            <Button type="button" disabled={!canSave} onClick={onSave}>
              {uploading ? (
                <>
                  <CircleNotch aria-hidden className="animate-spin" />
                  保存中…
                </>
              ) : (
                "このデータを保存する"
              )}
            </Button>
          }
        />
      )}
    </div>
  );
}
