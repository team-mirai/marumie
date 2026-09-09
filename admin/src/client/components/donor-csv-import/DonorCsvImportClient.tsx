"use client";
import "client-only";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type { PreviewDonorCsvRequest } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import type {
  ImportDonorCsvRequest,
  ImportDonorCsvResult,
} from "@/server/contexts/report/presentation/actions/import-donor-csv";
import DonorCsvPreview from "@/client/components/donor-csv-import/DonorCsvPreview";
import { Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { CsvDropzone } from "@/client/components/csv-upload/CsvDropzone";

interface DonorCsvImportClientProps {
  organizations: PoliticalOrganization[];
  previewAction: (data: PreviewDonorCsvRequest) => Promise<PreviewDonorCsvResult>;
  importAction: (data: ImportDonorCsvRequest) => Promise<ImportDonorCsvResult>;
}

/** 対応形式と上限サイズ（上限は next.config.ts の serverActions.bodySizeLimit に合わせる） */
const FILE_NOTE = "UTF-8 ・ 最大 100MB";

export default function DonorCsvImportClient({
  organizations,
  previewAction,
  importAction,
}: DonorCsvImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [politicalOrganizationId, setPoliticalOrganizationId] = useState<string>("");
  const [previewResult, setPreviewResult] = useState<PreviewDonorCsvResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewActionRef = useRef(previewAction);
  const importActionRef = useRef(importAction);

  // 最初の組織を自動選択
  useEffect(() => {
    if (organizations.length > 0 && !politicalOrganizationId) {
      setPoliticalOrganizationId(organizations[0].id);
    }
  }, [organizations, politicalOrganizationId]);

  useEffect(() => {
    previewActionRef.current = previewAction;
  }, [previewAction]);

  useEffect(() => {
    importActionRef.current = importAction;
  }, [importAction]);

  const stablePreviewAction = useCallback(
    (data: PreviewDonorCsvRequest) => previewActionRef.current(data),
    [],
  );

  // ファイルと政治団体が揃ったら自動でプレビューを取得する
  useEffect(() => {
    if (!file || !politicalOrganizationId) {
      setPreviewResult(null);
      setError(null);
      return;
    }

    const previewFile = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await stablePreviewAction({
          file,
          politicalOrganizationId,
        });
        setPreviewResult(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "CSVのプレビューに失敗しました";
        setError(errorMessage);
        setPreviewResult(null);
      } finally {
        setLoading(false);
      }
    };

    previewFile();
  }, [file, politicalOrganizationId, stablePreviewAction]);

  const resetFileInput = useCallback(() => {
    setFile(null);
    setPreviewResult(null);
    setError(null);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !politicalOrganizationId) {
      return;
    }

    setIsImporting(true);

    try {
      const csvContent = await file.text();
      const result = await importActionRef.current({
        csvContent,
        politicalOrganizationId,
      });

      if (result.ok) {
        toast.success(`${result.importedCount}件のインポートが完了しました`);
        resetFileInput();
      } else {
        toast.error(`インポートに失敗しました: ${result.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "インポートに失敗しました";
      toast.error(`インポートに失敗しました: ${errorMessage}`);
    } finally {
      setIsImporting(false);
    }
  }, [file, politicalOrganizationId, resetFileInput]);

  return (
    <div className="space-y-6">
      <div className="max-w-[720px] rounded-lg border border-border bg-card p-7">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>
              政治団体 <span className="text-destructive">*</span>
            </Label>
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={politicalOrganizationId}
              onValueChange={setPoliticalOrganizationId}
              required
              hideLabel
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-6">
          <CsvDropzone
            file={file}
            onFileChange={setFile}
            disabled={loading || isImporting}
            note={FILE_NOTE}
          />
        </div>

        {loading && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-lg border border-primary-active bg-accent p-3 text-sm text-primary-active"
          >
            <CircleNotch aria-hidden className="size-4 animate-spin" />
            ファイルを処理中...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-destructive bg-destructive-hover p-3 text-sm text-destructive"
          >
            エラー: {error}
          </div>
        )}
      </div>

      {previewResult && !loading && (
        <DonorCsvPreview result={previewResult} onImport={handleImport} isImporting={isImporting} />
      )}
    </div>
  );
}
