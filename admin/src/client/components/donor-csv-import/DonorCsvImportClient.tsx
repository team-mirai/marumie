"use client";
import "client-only";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type { PreviewDonorCsvRequest } from "@/server/contexts/report/presentation/actions/preview-donor-csv";
import type {
  ImportDonorCsvRequest,
  ImportDonorCsvResult,
} from "@/server/contexts/report/presentation/actions/import-donor-csv";
import DonorCsvPreview from "./DonorCsvPreview";
import { Input, Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";

interface DonorCsvImportClientProps {
  organizations: PoliticalOrganization[];
  previewAction: (data: PreviewDonorCsvRequest) => Promise<PreviewDonorCsvResult>;
  importAction: (data: ImportDonorCsvRequest) => Promise<ImportDonorCsvResult>;
}

export default function DonorCsvImportClient({
  organizations,
  previewAction,
  importAction,
}: DonorCsvImportClientProps) {
  const csvFileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    <div className="space-y-3">
      <PoliticalOrganizationSelect
        organizations={organizations}
        value={politicalOrganizationId}
        onValueChange={setPoliticalOrganizationId}
        required
      />
      <div>
        <Label htmlFor={csvFileInputId}>CSV File:</Label>
        <Input
          ref={fileInputRef}
          id={csvFileInputId}
          className="h-10 border-0 bg-transparent shadow-none file:mr-4 file:h-full file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </div>

      {loading && (
        <div className="bg-card/50 rounded-lg p-4">
          <p className="text-muted-foreground">ファイルを処理中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 rounded-lg p-4">
          <p className="text-red-500">エラー: {error}</p>
        </div>
      )}

      {previewResult && !loading && (
        <DonorCsvPreview result={previewResult} onImport={handleImport} isImporting={isImporting} />
      )}
    </div>
  );
}
